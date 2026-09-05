/* ============================================================
   ORBIT — data layer (Supabase Postgres + Supabase Auth backed)
   Products, reviews, orders and config live in Supabase, so
   every visitor and every admin session see the same data.
   Cart stays in localStorage — it's fine for it to be per-device.
   All product/review/order/config methods return Promises,
   so calling code uses `await STORE.getProducts()` etc.
   ============================================================ */

const STORE = {
  keys: { cart: 'orbit_cart' },

  uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); },

  // ---------- category line-art silhouettes (technical/blueprint style) ----------
  _categoryPath(category){
    const c = (category || '').toLowerCase();
    if(c.includes('outer')) return 'M150,58 L128,84 L150,100 L172,84 Z M128,84 L98,108 L92,182 L112,182 L120,138 L120,342 L180,342 L180,138 L188,182 L208,182 L202,108 L172,84 M120,150 L106,170 M180,150 L194,170';
    if(c.includes('top'))   return 'M150,78 L128,98 L100,92 L84,142 L112,158 L122,132 L122,322 L178,322 L178,132 L188,158 L216,142 L200,92 L172,98 Z';
    if(c.includes('bottom'))return 'M108,80 H192 L196,150 L182,322 L152,322 L150,180 L148,322 L118,322 L104,150 Z';
    return 'M104,152 Q104,108 150,108 Q196,108 196,152 L196,164 H104 Z M92,164 H208 L198,304 H102 Z'; // accessories
  },

  // ---------- placeholder "photo" plate — line-art catalog illustration ----------
  plate(name, category, index){
    const accent = index % 2 === 0 ? '#E3A857' : '#5FA9E0';
    const path = this._categoryPath(category);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
      <rect width="300" height="400" fill="#141519"/>
      <circle cx="150" cy="205" r="118" fill="none" stroke="${accent}" stroke-width="0.75" stroke-dasharray="2 6" opacity="0.55"/>
      <circle cx="150" cy="205" r="150" fill="none" stroke="${accent}" stroke-width="0.75" stroke-dasharray="1 8" opacity="0.3"/>
      <circle cx="150" cy="87" r="3.5" fill="${accent}"/>
      <path d="${path}" fill="none" stroke="#F3F2EE" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity="0.92"/>
      <text x="24" y="36" font-family="Space Grotesk, sans-serif" font-size="12" letter-spacing="1" fill="#B9B8B4">FIG. ${String(index).padStart(3,'0')}</text>
      <text x="276" y="36" text-anchor="end" font-family="Space Grotesk, sans-serif" font-size="12" letter-spacing="1" fill="${accent}">${(category||'').toUpperCase()}</text>
      <line x1="24" y1="370" x2="276" y2="370" stroke="#F3F2EE" stroke-opacity="0.25"/>
      <text x="24" y="356" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="13" letter-spacing="2" fill="#F3F2EE" opacity="0.9">ORBIT</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  },

  // ---------- row <-> object mapping (DB columns are lowercase/snake_case) ----------
  _productFromRow(r){ return { id:r.id, name:r.name, category:r.category, price:r.price, description:r.description, image:r.image, inStock:r.instock }; },
  _productToRow(p){ return { id:p.id, name:p.name, category:p.category, price:p.price, description:p.description, image:p.image, instock:p.inStock }; },
  _reviewFromRow(r){ return { id:r.id, productId:r.product_id, name:r.name, rating:r.rating, comment:r.comment }; },
  _reviewToRow(r){ return { id:r.id, product_id:r.productId, name:r.name, rating:r.rating, comment:r.comment }; },

  // ---------- products (Supabase table: products) ----------
  async seedProductsIfEmpty(){
    const { count } = await sb.from('products').select('id', { count:'exact', head:true });
    if(count && count > 0) return;
    const seed = [
      { name:'Perigee Wool Coat', category:'Outerwear', price:238, description:'A structured double-breasted coat in brushed wool, cut for the point in your day closest to the cold. Built to layer over everything else you own.' },
      { name:'Vector Overshirt', category:'Outerwear', price:126, description:'Heavyweight cotton twill overshirt with a boxy fit and triple-stitched seams. Reads as a jacket, moves like a shirt.' },
      { name:'Halo Knit Tee', category:'Tops', price:58, description:'Garment-dyed heavyweight jersey tee with a clean ribbed collar. Pre-shrunk, cut with a slight drop shoulder.' },
      { name:'Meridian Turtleneck', category:'Tops', price:88, description:'Fine-gauge merino turtleneck for layering season. Sits close to the line of the body without clinging.' },
      { name:'Apogee Trouser', category:'Bottoms', price:142, description:'Tapered wool-blend trouser with a deep side seam pocket and a clean break at the ankle.' },
      { name:'Transit Cargo Pant', category:'Bottoms', price:118, description:'Utility cargo in washed cotton canvas, built for movement with reinforced knees.' },
      { name:'Axis Leather Belt', category:'Accessories', price:46, description:'Full-grain leather belt with a matte brass buckle, aged to a deep umber over time.' },
      { name:'Satellite Tote', category:'Accessories', price:74, description:'Waxed canvas tote with a leather base and interior pocket, sized for a full day out.' }
    ];
    const rows = seed.map((p, i) => this._productToRow({
      ...p, id: this.uid(), image: this.plate(p.name, p.category, i+1), inStock: true
    }));
    await sb.from('products').insert(rows);
  },
  async getProducts(){
    await this.seedProductsIfEmpty();
    const { data, error } = await sb.from('products').select('*').order('name');
    if(error) throw error;
    return data.map(r => this._productFromRow(r));
  },
  async getProduct(id){
    const { data, error } = await sb.from('products').select('*').eq('id', id).maybeSingle();
    if(error || !data) return null;
    return this._productFromRow(data);
  },
  async upsertProduct(product){
    const { error } = await sb.from('products').upsert(this._productToRow(product));
    if(error) throw error;
  },
  async deleteProduct(id){
    const { error } = await sb.from('products').delete().eq('id', id);
    if(error) throw error;
  },

  // ---------- reviews (Supabase table: reviews) ----------
  async seedReviewsIfEmpty(products){
    const { count } = await sb.from('reviews').select('id', { count:'exact', head:true });
    if(count && count > 0) return;
    const names = ['Priya N.', 'Marcus T.', 'Aiko S.', 'Daniel R.', 'Farah H.', 'Colin W.'];
    const lines = [
      'Fit is exactly as described, and the fabric feels like it will outlast most of my wardrobe.',
      'Ordered a size up per the notes and it landed perfectly. Already planning my next order.',
      'The kind of piece you reach for every week. Construction feels genuinely considered.',
      'Shipping was quick and the packaging alone felt like part of the product.',
      'Color is richer in person than in photos. No complaints, would buy again.',
      'Runs true to size, holds its shape after washing. This is a repeat purchase for me.'
    ];
    const rows = products.slice(0,6).map((p, i) => this._reviewToRow({
      id: this.uid(), productId: p.id, name: names[i % names.length], rating: 4 + (i % 2), comment: lines[i % lines.length]
    }));
    await sb.from('reviews').insert(rows);
  },
  async getReviews(){
    const products = await this.getProducts();
    await this.seedReviewsIfEmpty(products);
    const { data, error } = await sb.from('reviews').select('*');
    if(error) throw error;
    return data.map(r => this._reviewFromRow(r));
  },
  async addReview(review){
    const row = this._reviewToRow({ id: this.uid(), ...review });
    const { error } = await sb.from('reviews').insert(row);
    if(error) throw error;
  },

  // ---------- cart (localStorage — per device on purpose) ----------
  getCart(){ try{ return JSON.parse(localStorage.getItem(this.keys.cart)) || []; }catch(e){ return []; } },
  saveCart(cart){ localStorage.setItem(this.keys.cart, JSON.stringify(cart)); this.updateCartBadge(); },
  addToCart(productId, qty){
    const cart = this.getCart();
    const line = cart.find(l => l.productId === productId);
    if(line){ line.qty += qty; } else { cart.push({ productId, qty }); }
    this.saveCart(cart);
  },
  updateCartQty(productId, qty){
    let cart = this.getCart();
    if(qty <= 0){ cart = cart.filter(l => l.productId !== productId); }
    else { const line = cart.find(l => l.productId === productId); if(line) line.qty = qty; }
    this.saveCart(cart);
  },
  removeFromCart(productId){ this.saveCart(this.getCart().filter(l => l.productId !== productId)); },
  clearCart(){ this.saveCart([]); },
  async cartLines(){
    const cart = this.getCart();
    const lines = await Promise.all(cart.map(async l => ({ ...l, product: await this.getProduct(l.productId) })));
    return lines.filter(l => l.product);
  },
  cartCount(){ return this.getCart().reduce((n,l) => n + l.qty, 0); },
  async cartSubtotal(){ return (await this.cartLines()).reduce((sum,l) => sum + l.product.price * l.qty, 0); },
  updateCartBadge(){
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = this.cartCount(); });
  },

  // ---------- orders (Supabase table: orders) ----------
  async getOrders(){
    const { data, error } = await sb.from('orders').select('*').order('date', { ascending:false });
    if(error) throw error;
    return data;
  },
  async createOrder(order){
    const id = 'ARK-' + this.uid().toUpperCase();
    const o = { id, date: new Date().toISOString(), ...order };
    const { error } = await sb.from('orders').insert(o);
    if(error) throw error;
    return o;
  },

  // ---------- config (Supabase table: config, single row id='store') ----------
  async getConfig(){
    const { data } = await sb.from('config').select('*').eq('id','store').maybeSingle();
    if(data) return data;
    const def = { id:'store', whatsapp: '15551234567' };
    await sb.from('config').insert(def);
    return def;
  },
  async setConfig(cfg){
    await sb.from('config').upsert({ id:'store', ...cfg });
  },

  // ---------- admin auth (Supabase Authentication) ----------
  async adminLogin(email, password){
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if(error) throw error;
  },
  adminLogout(){ return sb.auth.signOut(); },
  onAdminState(callback){
    sb.auth.getSession().then(({ data }) => callback(data.session ? data.session.user : null));
    sb.auth.onAuthStateChange((_event, session) => callback(session ? session.user : null));
  },
  async requireAdmin(loginPath){
    const { data } = await sb.auth.getSession();
    if(!data.session){ location.href = loginPath; }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  STORE.updateCartBadge();
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('nav.main-nav');
  if(toggle && nav){ toggle.addEventListener('click', () => nav.classList.toggle('open')); }
});
