/* MidlandGara Health application layer
 * Works in demo/localStorage mode until js/config.js contains real Supabase credentials.
 * When Supabase is configured, auth/data operations use the backend with RLS.
 */
(function () {
  "use strict";

  const cfg = window.MGH_CONFIG || {};
  const SUPABASE_READY = !!(window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey && !String(cfg.supabaseUrl).includes("YOUR_") && !String(cfg.supabaseAnonKey).includes("YOUR_"));
  const sb = SUPABASE_READY ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const LS = {
    user: "mgh_demo_user",
    cart: "mgh_cart",
    appointments: "mgh_appointments",
    cpd: "mgh_cpd",
    messages: "mgh_messages"
  };

  const demoProducts = [
    { id: "p1", name: "Digital Blood Pressure Monitor", category: "Monitoring", price: 3500, image: "Assets/images%20(1).jpeg", description: "For convenient home blood-pressure monitoring." },
    { id: "p2", name: "Health Monitoring Smart Watch", category: "Wearable", price: 4500, image: "Assets/images%20(2).jpg", description: "An everyday wearable with health-related monitoring features." },
    { id: "p3", name: "Digital Thermometer", category: "Monitoring", price: 650, image: "Assets/images.jpeg", description: "A simple tool for routine temperature checks." }
  ];
  const demoArticles = [
    { id: "a1", title: "Understanding Hypertension", category: "Cardiovascular Health", excerpt: "Learn what high blood pressure means, why it matters and how it is monitored.", url: "hypertension.html", image: "Assets/file_0000000099888230b8937740012e7aaf.png" },
    { id: "a2", title: "Understanding Diabetes", category: "Metabolic Health", excerpt: "Learn about diabetes, common symptoms, risk factors and prevention.", url: "education.html", image: "Assets/file_00000000a3bc81fdb243994c96db77b8.png" },
    { id: "a3", title: "Understanding Malaria", category: "Infectious Disease", excerpt: "Learn how malaria spreads, common symptoms, diagnosis and prevention.", url: "education.html", image: "Assets/file_00000000e03c8230b7ea78e3f035227f.png" },
    { id: "a4", title: "When ALS Took Away His Voice, Technology Gave Him a Way Back Into the Conversation", category: "ALS • Health Technology", excerpt: "A human-centred look at brain-computer interface research and communication.", url: "als.html", image: "Assets/InShot_20260920_170150419.jpg" }
  ];

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const money = n => `KES ${Number(n || 0).toLocaleString()}`;
  const escapeHtml = s => String(s ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const toast = (msg, type = "success") => {
    let box = $("#mgh-toast");
    if (!box) { box = document.createElement("div"); box.id = "mgh-toast"; box.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:9999;max-width:340px;padding:14px 16px;border-radius:12px;background:#0f4c81;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.2);font:600 14px/1.4 system-ui"; document.body.appendChild(box); }
    box.textContent = msg; box.style.background = type === "error" ? "#a83232" : "#0f4c81"; clearTimeout(box._t); box._t = setTimeout(() => box.remove(), 3600);
  };

  function initNavigation() {
    const menuButton = $(".menu-toggle"), navMenu = $(".nav-menu");
    if (menuButton && navMenu) {
      menuButton.addEventListener("click", () => {
        const open = navMenu.classList.toggle("open");
        menuButton.setAttribute("aria-expanded", String(open));
      });
      $$("a", navMenu).forEach(a => a.addEventListener("click", () => navMenu.classList.remove("open")));
      document.addEventListener("click", e => { if (!navMenu.contains(e.target) && !menuButton.contains(e.target)) navMenu.classList.remove("open"); });
    }
    const year = $("#year"); if (year) year.textContent = new Date().getFullYear();
  }

  async function getUser() {
    if (sb) { const { data } = await sb.auth.getUser(); return data?.user || null; }
    return read(LS.user, null);
  }

  function currentDemoUser() { return read(LS.user, null); }

  async function signUp(email, password, fullName) {
    if (!email || password.length < 6) throw new Error("Use a valid email and a password of at least 6 characters.");
 if (sb) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "https://midlandgara17.github.io/MidlandGaraHealth/",
      data: {
        full_name: fullName
      }
    }
  });

  if (error) throw error;
  return data.user;
}
    const user = { id: "demo-" + Date.now(), email, full_name: fullName, created_at: new Date().toISOString() };
    write(LS.user, user); return user;
  }

  async function signIn(email, password) {
    if (sb) { const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; return data.user; }
    const user = { id: "demo-" + btoa(email).replace(/=/g, ""), email, full_name: email.split("@")[0], created_at: new Date().toISOString() };
    write(LS.user, user); return user;
  }

  async function signOut() { if (sb) await sb.auth.signOut(); localStorage.removeItem(LS.user); location.href = "index.html"; }

  async function loadProducts() {
    if (sb) { const { data, error } = await sb.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }); if (!error && data?.length) return data; }
    return demoProducts;
  }

  function getCart() { return read(LS.cart, []); }
  function saveCart(cart) { write(LS.cart, cart); renderCartCount(); }

  async function addToCart(productId) {
    const products = await loadProducts(); const product = products.find(p => String(p.id) === String(productId)); if (!product) return;
    const cart = getCart(); const existing = cart.find(i => String(i.product_id) === String(productId));
    if (existing) existing.quantity += 1; else cart.push({ product_id: product.id, name: product.name, price: Number(product.price || 0), image: product.image, quantity: 1 });
    saveCart(cart); toast(`${product.name} added to cart.`);
  }

  function removeFromCart(id) { saveCart(getCart().filter(i => String(i.product_id) !== String(id))); renderCart(); }
  function changeQty(id, delta) { const c = getCart(); const item = c.find(i => String(i.product_id) === String(id)); if (item) item.quantity += delta; saveCart(c.filter(i => i.quantity > 0)); renderCart(); }
  function cartTotal() { return getCart().reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0); }
  function renderCartCount() { const count = getCart().reduce((s, i) => s + Number(i.quantity), 0); $$("[data-cart-count]").forEach(el => el.textContent = count); }

  function ensureCartUI() {
    if ($("#mgh-cart-drawer")) return;
    const drawer = document.createElement("aside"); drawer.id = "mgh-cart-drawer"; drawer.hidden = true; drawer.style.cssText = "position:fixed;inset:0 0 0 auto;width:min(420px,100%);z-index:9998;background:#fff;box-shadow:-12px 0 40px rgba(0,0,0,.2);padding:24px;overflow:auto";
    drawer.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h2>Your cart</h2><button type="button" data-cart-close aria-label="Close cart">×</button></div><div id="mgh-cart-items"></div><div style="border-top:1px solid #ddd;margin-top:18px;padding-top:18px"><strong>Total: <span id="mgh-cart-total">KES 0</span></strong><button class="btn btn-primary" type="button" id="mgh-checkout" style="width:100%;margin-top:14px">Continue to appointment / enquiry</button></div>`;
    document.body.appendChild(drawer);
    $("[data-cart-close]").addEventListener("click", () => drawer.hidden = true);
    $("#mgh-checkout").addEventListener("click", () => { drawer.hidden = true; location.href = "contact.html#appointment"; });
  }
  function renderCart() { ensureCartUI(); const wrap = $("#mgh-cart-items"); if (!wrap) return; const cart = getCart(); wrap.innerHTML = cart.length ? cart.map(i => `<div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #eee"><div style="flex:1"><strong>${escapeHtml(i.name)}</strong><div>${money(i.price)} × ${i.quantity}</div><button type="button" data-minus="${i.product_id}">−</button> <button type="button" data-plus="${i.product_id}">+</button> <button type="button" data-remove="${i.product_id}">Remove</button></div></div>`).join("") : "<p>Your cart is empty.</p>"; $("#mgh-cart-total").textContent = money(cartTotal()); $$("[data-minus]").forEach(b => b.onclick = () => changeQty(b.dataset.minus, -1)); $$("[data-plus]").forEach(b => b.onclick = () => changeQty(b.dataset.plus, 1)); $$("[data-remove]").forEach(b => b.onclick = () => removeFromCart(b.dataset.remove)); }

  async function renderProducts() {
    const root = $("[data-product-list]"); if (!root) return; const products = await loadProducts();
    root.innerHTML = products.map(p => `<article class="card product-card"><img class="product-image" src="${escapeHtml(p.image || "")}" alt="${escapeHtml(p.name)}" loading="lazy"><div class="product-body"><span class="eyebrow">${escapeHtml(p.category || "HEALTH PRODUCT")}</span><h2>${escapeHtml(p.name)}</h2><p>${escapeHtml(p.description || "")}</p><p class="price">${p.price ? money(p.price) : "Contact us for current price"}</p></div><button class="btn btn-primary" type="button" data-add-product="${escapeHtml(p.id)}">Add to cart</button></article>`).join("");
    $$('[data-add-product]').forEach(b => b.onclick = () => addToCart(b.dataset.addProduct));
  }

  async function submitAppointment(form) {
    const user = await getUser(); const fd = new FormData(form); const payload = { name: fd.get("name"), phone: fd.get("phone"), email: fd.get("email"), service: fd.get("service"), preferred_date: fd.get("date"), preferred_time: fd.get("time"), notes: fd.get("notes") };
    if (!payload.name || !payload.phone || !payload.service || !payload.preferred_date) throw new Error("Please complete your name, phone, service and preferred date.");
    if (sb) { const { error } = await sb.from("appointments").insert({ ...payload, user_id: user?.id || null, status: "pending" }); if (error) throw error; }
    else { const arr = read(LS.appointments, []); arr.push({ ...payload, id: "demo-appt-" + Date.now(), user_id: user?.id || null, status: "pending", created_at: new Date().toISOString() }); write(LS.appointments, arr); }
    form.reset(); toast("Appointment request submitted. We will contact you to confirm.");
  }

  async function submitContact(form) {
    const fd = new FormData(form); const payload = { name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"), subject: fd.get("subject"), message: fd.get("message") };
    if (!payload.name || !payload.message) throw new Error("Please enter your name and message.");
    if (sb) { const user = await getUser(); const { error } = await sb.from("contact_messages").insert({ ...payload, user_id: user?.id || null }); if (error) throw error; }
    else { const arr = read(LS.messages, []); arr.push({ ...payload, created_at: new Date().toISOString() }); write(LS.messages, arr); }
    form.reset(); toast("Your message has been submitted.");
  }

  async function saveCpd(form) {
    const user = await getUser(); if (!user) { location.href = "portal.html#login"; return; }
    const fd = new FormData(form); const record = { activity: fd.get("activity"), provider: fd.get("provider"), date: fd.get("date"), points: Number(fd.get("points") || 0), notes: fd.get("notes") };
    if (!record.activity || !record.date) throw new Error("Activity and date are required.");
    if (sb) { const { error } = await sb.from("cpd_records").insert({ ...record, user_id: user.id }); if (error) throw error; }
    else { const arr = read(LS.cpd, []); arr.push({ ...record, id: "demo-cpd-" + Date.now(), user_id: user.id }); write(LS.cpd, arr); }
    form.reset(); await renderDashboard(); toast("CPD record saved.");
  }

  async function getDashboardData() {
    const user = await getUser(); if (!user) return null;
    if (sb) {
      const [a, c] = await Promise.all([sb.from("appointments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }), sb.from("cpd_records").select("*").eq("user_id", user.id).order("date", { ascending: false })]);
      return { user, appointments: a.data || [], cpd: c.data || [] };
    }
    return { user, appointments: read(LS.appointments, []).filter(x => x.user_id === user.id), cpd: read(LS.cpd, []).filter(x => x.user_id === user.id) };
  }

  async function renderDashboard() {
    const root = $("[data-dashboard]"); if (!root) return; const data = await getDashboardData();
    if (!data) { root.innerHTML = `<div class="notice"><p>You are not signed in. <a href="portal.html#login">Sign in or create an account</a>.</p></div>`; return; }
    const points = data.cpd.reduce((s, x) => s + Number(x.points || 0), 0);
    root.innerHTML = `<div class="section-heading"><span class="eyebrow">MY ACCOUNT</span><h1>Welcome, ${escapeHtml(data.user.user_metadata?.full_name || data.user.full_name || data.user.email?.split("@")[0] || "Member")}</h1><p>${escapeHtml(data.user.email || "")}</p></div><div class="grid grid-3"><div class="card"><h3>CPD points recorded</h3><p style="font-size:2rem;font-weight:700">${points}</p></div><div class="card"><h3>Appointments</h3><p style="font-size:2rem;font-weight:700">${data.appointments.length}</p></div><div class="card"><h3>Cart</h3><p style="font-size:2rem;font-weight:700">${getCart().reduce((s,i)=>s+i.quantity,0)}</p><button class="btn btn-primary" type="button" data-open-cart>Open cart</button></div></div><div class="section"><h2>My appointments</h2>${data.appointments.length ? data.appointments.map(a => `<div class="card"><strong>${escapeHtml(a.service)}</strong><p>${escapeHtml(a.preferred_date || a.date || "")} ${escapeHtml(a.preferred_time || "")} • ${escapeHtml(a.status || "pending")}</p></div>`).join("") : "<p>No appointment requests yet.</p>"}<h2>My CPD records</h2>${data.cpd.length ? data.cpd.map(c => `<div class="card"><strong>${escapeHtml(c.activity)}</strong><p>${escapeHtml(c.provider || "")} • ${escapeHtml(c.date)} • ${c.points || 0} points</p></div>`).join("") : "<p>No CPD records yet.</p>"}</div>`;
    const open = $("[data-open-cart]"); if (open) open.onclick = () => { ensureCartUI(); renderCart(); $("#mgh-cart-drawer").hidden = false; };
  }

  function wireAuth() {
  const form = $("#login-form");

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      try {
        await signIn(
          form.email.value.trim(),
          form.password.value
        );

        toast("Signed in successfully.");

        setTimeout(() => {
          location.href = "dashboard.html";
        }, 500);

      } catch (err) {
        toast(
          err.message || "Sign in failed.",
          "error"
        );
      }
    });
  }

  const signup = $("#signup-form");

  if (signup) {
    signup.addEventListener("submit", async e => {
      e.preventDefault();

      try {
        const user = await signUp(
          signup.email.value.trim(),
          signup.password.value,
          signup.full_name.value.trim()
        );

        if (sb && user) {
          toast(
            "Account created. Please check your email and confirm your account."
          );
          return;
        }

        toast("Account created.");

        setTimeout(() => {
          location.href = "dashboard.html";
        }, 500);

      } catch (err) {
        toast(
          err.message || "Sign up failed.",
          "error"
        );
      }
    });
  }

  $$("[data-signout]").forEach(b =>
    b.addEventListener("click", signOut)
  );
}

  function wireForms() {
    const appt = $("#appointment-form"); if (appt) appt.addEventListener("submit", async e => { e.preventDefault(); try { await submitAppointment(appt); } catch (err) { toast(err.message || "Could not submit appointment.", "error"); } });
    const contact = $("#contact-form"); if (contact) contact.addEventListener("submit", async e => { e.preventDefault(); try { await submitContact(contact); } catch (err) { toast(err.message || "Could not submit message.", "error"); } });
    const cpd = $("#cpd-form"); if (cpd) cpd.addEventListener("submit", async e => { e.preventDefault(); try { await saveCpd(cpd); } catch (err) { toast(err.message || "Could not save CPD record.", "error"); } });
  }

  async function wireSearch() {
    const input = $("[data-article-search]"), root = $("[data-article-results]"); if (!input || !root) return;
    let articles = demoArticles;
    if (sb) { const { data } = await sb.from("articles").select("id,title,category,excerpt,url,image").eq("is_published", true).order("published_at", { ascending: false }); if (data?.length) articles = data; }
    const render = q => { const term = q.toLowerCase().trim(); const list = articles.filter(a => !term || `${a.title} ${a.category} ${a.excerpt}`.toLowerCase().includes(term)); root.innerHTML = list.map(a => `<article class="library-card"><div class="library-card-image"><img src="${escapeHtml(a.image || "")}" alt="${escapeHtml(a.title)}" loading="lazy"></div><div class="library-card-content"><span class="article-tag">${escapeHtml(a.category || "HEALTH")}</span><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.excerpt || "")}</p><a href="${escapeHtml(a.url || "#")}">Read article →</a></div></article>`).join("") || "<p>No matching articles found.</p>"; };
    input.addEventListener("input", () => render(input.value)); render("");
  }


    /*
   * Supabase authentication state
   * Handles the session after email confirmation.
   */
  if (sb) {
    sb.auth.onAuthStateChange((event, session) => {

      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        session?.user
      ) {
        const path = window.location.pathname;

        /*
         * If the user has just confirmed their email
         * or signs in from the portal, take them to
         * their account dashboard.
         */
        if (
          path.endsWith("/portal.html") ||
          path.endsWith("/index.html") ||
          path.endsWith("/MidlandGaraHealth/") ||
          path.endsWith("/MidlandGaraHealth")
        ) {
          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 300);
        }
      }

      if (event === "SIGNED_OUT") {
        console.log("MidlandGara Health: user signed out.");
      }
    });
  }
  
  document.addEventListener("DOMContentLoaded", async () => {
    initNavigation(); renderCartCount(); ensureCartUI(); wireAuth(); wireForms(); await renderProducts(); await wireSearch(); await renderDashboard();
    $$("[data-open-cart]").forEach(b => b.addEventListener("click", () => { renderCart(); $("#mgh-cart-drawer").hidden = false; }));
    $$("[data-auth-status]").forEach(async el => { const u = await getUser(); el.textContent = u ? `Signed in as ${u.email}` : "Sign in / Sign up"; });
  });

  window.MGH = { addToCart, signIn, signUp, signOut, getUser, loadProducts, getCart };
})();
