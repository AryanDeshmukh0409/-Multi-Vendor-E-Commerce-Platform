import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { catalogAPI, reviewAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';

export default function ProductDetail() {
  const { id }                    = useParams();
  const { user, token }           = useAuth();
  const navigate                  = useNavigate();
  const [product, setProduct]     = useState(null);
  const [reviews, setReviews]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [qty, setQty]             = useState(1);
  const [cartMsg, setCartMsg]     = useState('');

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await catalogAPI.getProduct(id);
      setProduct(res.data.product);
    } catch (err) {
      console.error('Failed to load product:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await reviewAPI.getProductReviews(id);
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  const handleAddToCart = () => {
    if (!user) { navigate('/login'); return; }
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const exists = cart.find(i => i._id === product._id);
    if (exists) {
      exists.qty += qty;
    } else {
      cart.push({ ...product, qty });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    setCartMsg(`✅ Added ${qty} item(s) to cart!`);
    setTimeout(() => setCartMsg(''), 3000);
  };

  const handleBuyNow = () => {
    if (!user) { navigate('/login'); return; }
    handleAddToCart();
    navigate('/cart');
  };

  if (loading) return <div style={styles.loading}>Loading product...</div>;
  if (!product) return <div style={styles.loading}>Product not found.</div>;

  const attrs = product.attributes instanceof Map
    ? Object.fromEntries(product.attributes)
    : product.attributes || {};

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Back button */}
        <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>

        {/* Product section */}
        <div style={styles.productSection}>

          {/* Image */}
          <div style={styles.imageBox}>
            {product.images?.[0]
              ? <img src={product.images[0]} alt={product.title} style={styles.image} />
              : <div style={styles.noImage}>📦</div>
            }
          </div>

          {/* Details */}
          <div style={styles.details}>
            <p style={styles.category}>{product.category}</p>
            <h1 style={styles.title}>{product.title}</h1>

            <div style={styles.ratingRow}>
              <span style={styles.stars}>
                {[1,2,3,4,5].map(s => (
                  <span key={s} style={{ color: s <= Math.round(product.avgRating) ? '#ffd700' : '#555' }}>★</span>
                ))}
              </span>
              <span style={styles.ratingText}>
                {product.avgRating > 0 ? product.avgRating.toFixed(1) : 'No ratings yet'}
              </span>
              <span style={styles.reviewCount}>({reviews.length} reviews)</span>
            </div>

            <p style={styles.price}>${(product.price / 100).toFixed(2)}</p>

            <p style={styles.description}>{product.description}</p>

            {/* Attributes */}
            {Object.keys(attrs).length > 0 && (
              <div style={styles.attrsBox}>
                <h4 style={styles.attrsTitle}>Specifications</h4>
                <div style={styles.attrsGrid}>
                  {Object.entries(attrs).map(([k, v]) => (
                    <div key={k} style={styles.attrItem}>
                      <span style={styles.attrKey}>{k}</span>
                      <span style={styles.attrVal}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Qty + buttons */}
            <div style={styles.qtyRow}>
              <label style={styles.qtyLabel}>Quantity:</label>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={styles.qtyBtn}>−</button>
              <span style={styles.qtyVal}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={styles.qtyBtn}>+</button>
            </div>

            {cartMsg && <div style={styles.cartMsg}>{cartMsg}</div>}

            <div style={styles.btnRow}>
              <button onClick={handleAddToCart} style={styles.addCartBtn}>🛒 Add to Cart</button>
              <button onClick={handleBuyNow}    style={styles.buyNowBtn}>⚡ Buy Now</button>
            </div>

            <div style={styles.statusBadge}>
              Status: <span style={{ color: product.status === 'active' ? '#4ecca3' : '#e94560' }}>
                {product.status}
              </span>
            </div>
          </div>
        </div>

        {/* Reviews section */}
        <div style={styles.reviewsSection}>
          <h2 style={styles.reviewsTitle}>Customer Reviews</h2>

          {reviews.length === 0 ? (
            <div style={styles.noReviews}>
              No reviews yet. Be the first to review this product!
            </div>
          ) : (
            <div style={styles.reviewsList}>
              {reviews.map(r => (
                <div key={r._id} style={styles.reviewCard}>
                  <div style={styles.reviewHeader}>
                    <div style={styles.reviewStars}>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{ color: s <= r.rating ? '#ffd700' : '#555' }}>★</span>
                      ))}
                    </div>
                    <span style={styles.reviewDate}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={styles.reviewBody}>{r.body}</p>
                  <span style={styles.reviewBadge}>✅ Verified Purchase</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:      { backgroundColor: '#0a0a1a', minHeight: '100vh', color: '#fff' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
  loading:   { color: '#aaa', textAlign: 'center', padding: '4rem', backgroundColor: '#0a0a1a' },
  backBtn:   { backgroundColor: 'transparent', border: '1px solid #aaa', color: '#aaa', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '2rem' },

  productSection: { display: 'flex', gap: '3rem', marginBottom: '3rem', flexWrap: 'wrap' },
  imageBox: { width: '400px', height: '400px', backgroundColor: '#16213e', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  image:    { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' },
  noImage:  { fontSize: '5rem' },

  details:     { flex: 1, minWidth: '300px' },
  category:    { color: '#e94560', fontSize: '0.8rem', textTransform: 'uppercase', margin: '0 0 0.5rem' },
  title:       { color: '#fff', fontSize: '2rem', margin: '0 0 1rem', lineHeight: 1.3 },
  ratingRow:   { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' },
  stars:       { fontSize: '1.2rem' },
  ratingText:  { color: '#ffd700', fontWeight: 'bold' },
  reviewCount: { color: '#aaa', fontSize: '0.9rem' },
  price:       { color: '#4ecca3', fontSize: '2rem', fontWeight: 'bold', margin: '0 0 1rem' },
  description: { color: '#ccc', lineHeight: 1.7, marginBottom: '1.5rem' },

  attrsBox:   { backgroundColor: '#16213e', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' },
  attrsTitle: { color: '#fff', margin: '0 0 0.8rem', fontSize: '0.95rem' },
  attrsGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' },
  attrItem:   { display: 'flex', justifyContent: 'space-between' },
  attrKey:    { color: '#aaa', fontSize: '0.85rem', textTransform: 'capitalize' },
  attrVal:    { color: '#fff', fontSize: '0.85rem' },

  qtyRow:    { display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' },
  qtyLabel:  { color: '#aaa' },
  qtyBtn:    { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#16213e', border: '1px solid #0f3460', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' },
  qtyVal:    { color: '#fff', fontSize: '1.1rem', minWidth: '2rem', textAlign: 'center' },

  cartMsg:    { backgroundColor: '#4ecca320', border: '1px solid #4ecca3', color: '#4ecca3', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem' },
  btnRow:     { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  addCartBtn: { flex: 1, padding: '0.9rem', borderRadius: '10px', backgroundColor: 'transparent', border: '2px solid #4ecca3', color: '#4ecca3', fontSize: '1rem', cursor: 'pointer' },
  buyNowBtn:  { flex: 1, padding: '0.9rem', borderRadius: '10px', backgroundColor: '#e94560', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer' },
  statusBadge:{ color: '#aaa', fontSize: '0.85rem' },

  reviewsSection: { borderTop: '1px solid #16213e', paddingTop: '2rem' },
  reviewsTitle:   { color: '#fff', fontSize: '1.5rem', marginBottom: '1.5rem' },
  noReviews:      { color: '#aaa', padding: '2rem', textAlign: 'center', backgroundColor: '#16213e', borderRadius: '12px' },
  reviewsList:    { display: 'flex', flexDirection: 'column', gap: '1rem' },
  reviewCard:     { backgroundColor: '#16213e', borderRadius: '12px', padding: '1.2rem' },
  reviewHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' },
  reviewStars:    { fontSize: '1.1rem' },
  reviewDate:     { color: '#aaa', fontSize: '0.85rem' },
  reviewBody:     { color: '#ccc', lineHeight: 1.6, marginBottom: '0.5rem' },
  reviewBadge:    { color: '#4ecca3', fontSize: '0.75rem' },
};