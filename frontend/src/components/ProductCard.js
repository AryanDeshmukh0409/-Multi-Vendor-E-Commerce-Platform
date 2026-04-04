import { useNavigate } from 'react-router-dom';

export default function ProductCard({ product, onAddToCart }) {
  const navigate = useNavigate();

  return (
    <div style={styles.card}>
      {/* Image */}
      <div style={styles.imageBox}>
        {product.images?.[0]
          ? <img src={product.images[0]} alt={product.title} style={styles.image} />
          : <div style={styles.noImage}>📦</div>
        }
      </div>

      {/* Info */}
      <div style={styles.info}>
        <p style={styles.category}>{product.category}</p>
        <h3 style={styles.title}>{product.title}</h3>
        <p style={styles.description}>{product.description?.slice(0, 80)}...</p>

        <div style={styles.footer}>
          <span style={styles.price}>${(product.price / 100).toFixed(2)}</span>
          <div style={styles.rating}>
            ⭐ {product.avgRating > 0 ? product.avgRating.toFixed(1) : 'No ratings'}
          </div>
        </div>

        <div style={styles.buttons}>
          <button
            style={styles.viewBtn}
            onClick={() => navigate(`/product/${product._id}`)}
          >
            View Details
          </button>
          <button
            style={styles.cartBtn}
            onClick={() => onAddToCart(product)}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#16213e',
    borderRadius:    '12px',
    overflow:        'hidden',
    boxShadow:       '0 4px 15px rgba(0,0,0,0.2)',
    transition:      'transform 0.2s',
    cursor:          'pointer',
  },
  imageBox: {
    height:          '180px',
    backgroundColor: '#0f3460',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
  },
  image: {
    width:     '100%',
    height:    '100%',
    objectFit: 'cover',
  },
  noImage: {
    fontSize: '3rem',
  },
  info: {
    padding: '1rem',
  },
  category: {
    color:     '#e94560',
    fontSize:  '0.75rem',
    textTransform: 'uppercase',
    margin:    '0 0 0.3rem',
  },
  title: {
    color:     '#fff',
    fontSize:  '1rem',
    margin:    '0 0 0.4rem',
  },
  description: {
    color:     '#aaa',
    fontSize:  '0.85rem',
    margin:    '0 0 0.8rem',
  },
  footer: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   '0.8rem',
  },
  price: {
    color:      '#4ecca3',
    fontSize:   '1.1rem',
    fontWeight: 'bold',
  },
  rating: {
    color:    '#ffd700',
    fontSize: '0.85rem',
  },
  buttons: {
    display: 'flex',
    gap:     '0.5rem',
  },
  viewBtn: {
    flex:            1,
    padding:         '0.5rem',
    backgroundColor: 'transparent',
    border:          '1px solid #4ecca3',
    color:           '#4ecca3',
    borderRadius:    '8px',
    cursor:          'pointer',
    fontSize:        '0.85rem',
  },
  cartBtn: {
    flex:            1,
    padding:         '0.5rem',
    backgroundColor: '#e94560',
    border:          'none',
    color:           '#fff',
    borderRadius:    '8px',
    cursor:          'pointer',
    fontSize:        '0.85rem',
  },
};