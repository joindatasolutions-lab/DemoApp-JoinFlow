/******************************
 * CONFIGURACIÓN GENERAL
 ******************************/
const fmtCOP = v => Number(v || 0).toLocaleString('es-CO');
const state = { catalogo: [], cart: [] };

// Constantes
const WHATSAPP_NUMERO = "573332571225";
const WOMPI_BACKEND = "https://script.google.com/macros/s/AKfycbyugA-riUX-0YED15RpEAEKzPlAPhS6I9V_EnEhvrz32lqs8R5TJ02aAlfs7nlw_PB2/exec";

/******************************
 * INICIALIZACIÓN
 ******************************/
async function init() {
  try {
    const res = await fetch("productos.json");
    state.catalogo = await res.json();
    renderCatalog();
  } catch (error) {
    Swal.fire("Error", "No se pudo cargar el catálogo", "error");
  }
}

/******************************
 * BUSCADOR
 ******************************/
function filtrarCatalogo() {
  const texto = document.getElementById("searchInput").value.toLowerCase().trim();

  if (texto === "") {
    pintarCatalogo(state.catalogo);
    return;
  }

  const filtrados = state.catalogo.filter(p =>
    p.nombre.toLowerCase().includes(texto)
  );

  pintarCatalogo(filtrados);
}

/******************************
 * RENDERIZAR CATÁLOGO
 ******************************/
function renderCatalog() {
  pintarCatalogo(state.catalogo);
}

function pintarCatalogo(lista) {
  const cont = document.getElementById("catalogo");
  cont.innerHTML = "";

  lista.forEach(prod => {
    let tallas = [];

    // 🍕 Caso pizzas → “S a XL”
    if (typeof prod.tallas === "string" && prod.tallas.toLowerCase().includes("s a xl")) {
      tallas = ["S", "M", "L", "XL"];
    }

    // Rango numérico tipo "1 a 5"
    else if (typeof prod.tallas === "string") {
      const match = prod.tallas.match(/(\d+)\s*a\s*(\d+)/);
      if (match) {
        for (let i = parseInt(match[1]); i <= parseInt(match[2]); i++) {
          tallas.push(i);
        }
      } else {
        // N/A u otro texto → mostrar N/A
        tallas = ["N/A"];
      }
    }

    // Array de tallas
    else {
      tallas = prod.tallas || ["N/A"];
    }

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${prod.imagen}" alt="${prod.nombre}">
      <div class="body">
        <div class="name">${prod.nombre}</div>
        <div class="price">$${fmtCOP(prod.precio)}</div>

        <select id="Tamaño-${prod.id}">
          ${tallas.map(t => `<option value="${t}">${t}</option>`).join("")}
        </select>

        <button class="btn-add" onclick="addToCart('${prod.id}')">Agregar al carrito</button>
      </div>
    `;

    cont.appendChild(card);
  });
}

/******************************
 * AGREGAR AL CARRITO
 ******************************/
function addToCart(id) {
  const prod = state.catalogo.find(p => p.id === id);
  if (!prod) return;

  const select = document.getElementById(`Tamaño-${id}`);
  const tallaSeleccionada = select.value;

  // Si es N/A no se exige talla
  let tallaFinal = tallaSeleccionada;
  if (tallaSeleccionada === "N/A") {
    tallaFinal = "N/A";
  }

  if (!tallaSeleccionada) {
    Swal.fire("Selecciona un tamaño", "", "warning");
    return;
  }

  const existe = state.cart.find(p => p.id === id && p.Tamaño === tallaFinal);

  if (existe) {
    existe.qty += 1;
  } else {
    state.cart.push({ ...prod, Tamaño: tallaFinal, qty: 1 });
  }

  updateCartCount();
  renderDrawerCart();

  Swal.fire({
    title: 'Producto agregado',
    text: `${prod.nombre} (Tamaño ${tallaFinal}) añadido al carrito`,
    icon: 'success',
    timer: 1200,
    showConfirmButton: false
  });
}

/******************************
 * CARRITO (Drawer)
 ******************************/
document.getElementById("btnDrawer").onclick = () => {
  renderDrawerCart();
  document.getElementById("drawerCarrito").classList.add("open");
};

document.getElementById("cerrarDrawer").onclick = () =>
  document.getElementById("drawerCarrito").classList.remove("open");

document.getElementById("vaciarCarrito").onclick = () => {
  state.cart = [];
  updateCartCount();
  renderDrawerCart();
};

function updateCartCount() {
  document.getElementById("cartCount").textContent =
    state.cart.reduce((a, b) => a + b.qty, 0);
}

function changeQty(id, tamaño, delta) {
  const item = state.cart.find(p => p.id === id && p.Tamaño === tamaño);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    state.cart = state.cart.filter(p => !(p.id === id && p.Tamaño === tamaño));
  }

  updateCartCount();
  renderDrawerCart();
}

function renderDrawerCart() {
  const cont = document.getElementById("cartItemsDrawer");
  cont.innerHTML = "";

  if (state.cart.length === 0) {
    cont.innerHTML = `<p style="text-align:center;color:#666;">Tu carrito está vacío 🛒</p>`;
    document.getElementById("subtotalDrawer").textContent = "0";
    document.getElementById("totalDrawer").textContent = "0";
    return;
  }

  let subtotal = 0;

  state.cart.forEach(p => {
    const sub = p.precio * p.qty;
    subtotal += sub;

    cont.innerHTML += `
      <li class="cart-item">
        <div>
          <div class="name">${p.nombre}</div>
          <div class="price">$${fmtCOP(p.precio)} c/u — Tamaño: ${p.Tamaño}</div>
        </div>
        <div class="qty">
          <button onclick="changeQty('${p.id}','${p.Tamaño}', -1)">−</button>
          <span>${p.qty}</span>
          <button onclick="changeQty('${p.id}','${p.Tamaño}', 1)">+</button>
        </div>
      </li>
    `;
  });

  document.getElementById("subtotalDrawer").textContent = fmtCOP(subtotal);
  document.getElementById("totalDrawer").textContent = fmtCOP(subtotal);
}

/******************************
 * FLUJO ENTRE VISTAS
 ******************************/
function show(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// 🔙 BOTÓN REGRESAR
document.getElementById("btnVolver").onclick = () => {
  show("viewCatalog");
};

/******************************
 * CONTINUAR PEDIDO
 ******************************/
document.getElementById("btnContinuarPedido").onclick = () => {
  if (state.cart.length === 0) {
    Swal.fire("Tu carrito está vacío", "", "warning");
    return;
  }

  const resumen = state.cart
    .map(p => `${p.qty}× ${p.nombre} (Tamaño ${p.Tamaño})`)
    .join(" | ");

  const subtotal = state.cart.reduce((a, b) => a + b.precio * b.qty, 0);

  const div = document.getElementById("resumenProducto");
  div.innerHTML = `
    <div class="pedido-summary">
      🛍 ${resumen} — Subtotal: $${fmtCOP(subtotal)}
    </div>
  `;

  show("viewForm");
  document.getElementById("drawerCarrito").classList.remove("open");
};

/******************************
 * CONFIRMAR DATOS
 ******************************/
document.getElementById("btnConfirmarPedido").onclick = () => {
  const nombre = document.getElementById("nombreCliente").value.trim();
  const tel = document.getElementById("telefonoCliente").value.trim();
  const dir = document.getElementById("direccionCliente").value.trim();
  const bar = document.getElementById("barrioCliente").value.trim();

  if (!nombre || !tel || !dir || !bar) {
    Swal.fire("Completa todos los campos", "", "warning");
    return;
  }

  // Evita recuadro duplicado
  document.getElementById("resumenProducto").innerHTML = "";

  document.getElementById("metodosPago").style.display = "flex";
  document.getElementById("btnConfirmarPedido").disabled = true;

  Swal.fire("Datos confirmados", "Elige cómo pagar", "success");
};

/******************************
 * WHATSAPP
 ******************************/
document.getElementById("btnConfirmarWhatsapp").onclick = () => {
  const nombre = document.getElementById("nombreCliente").value.trim();
  const tel = document.getElementById("telefonoCliente").value.trim();
  const dir = document.getElementById("direccionCliente").value.trim();
  const bar = document.getElementById("barrioCliente").value.trim();

  const total = state.cart.reduce((a, b) => a + b.precio * b.qty, 0);

  const mensaje =
    `🧾 *Pedido de ${nombre}*\n` +
    `📞 ${tel}\n📍 ${dir}, ${bar}\n\n` +
    state.cart.map(p => `• ${p.qty}× ${p.nombre} (Tamaño ${p.Tamaño})`).join("\n") +
    `\n\n💰 Total: $${fmtCOP(total)}\nGracias por tu compra 😊`;

  window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`);
};

/******************************
 * INICIAR
 ******************************/
init();
