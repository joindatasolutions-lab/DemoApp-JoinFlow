/******************************
 * CONFIGURACIÓN GENERAL
 ******************************/
const fmtCOP = v => Number(v || 0).toLocaleString('es-CO');
const state = { catalogo: [], cart: [] };

// Constantes de integración
const WHATSAPP_NUMERO = "573332571225"; // Número de WhatsApp
const WOMPI_BACKEND = "https://script.google.com/macros/s/AKfycbyugA-riUX-0YED15RpEAEKzPlAPhS6I9V_EnEhvrz32lqs8R5TJ02aAlfs7nlw_PB2/exec"; // Apps Script para generar link firmado

/******************************
 * INICIALIZACIÓN
 ******************************/
async function init() {
  try {
    const res = await fetch("productos.json");
    state.catalogo = await res.json();
    renderCatalog();
  } catch (error) {
    console.error("Error cargando catálogo:", error);
    Swal.fire("Error", "No se pudo cargar el catálogo", "error");
  }
}

/******************************
 * RENDERIZAR CATÁLOGO
 ******************************/
function renderCatalog() {
  const cont = document.getElementById("catalogo");
  cont.innerHTML = "";

  state.catalogo.forEach(prod => {
    // Convertir texto de tallas ("23 a 32") a lista de opciones
    let tallas = [];
    if (typeof prod.tallas === "string") {
      const match = prod.tallas.match(/(\d+)\s*a\s*(\d+)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        for (let i = min; i <= max; i++) tallas.push(i);
      } else {
        tallas = [prod.tallas];
      }
    } else if (Array.isArray(prod.tallas)) {
      tallas = prod.tallas;
    }

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${prod.imagen}" alt="${prod.nombre}">
      <div class="body">
        <div class="name">${prod.nombre}</div>
        <div class="price">$${fmtCOP(prod.precio)}</div>
        <div style="margin-bottom:10px;">
          <label style="font-size:0.85rem;color:#666;">Talla:</label>
          <select id="talla-${prod.id}" class="select-talla">
            <option value="">Selecciona</option>
            ${tallas.map(t => `<option value="${t}">${t}</option>`).join("")}
          </select>
        </div>
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

  const select = document.getElementById(`talla-${id}`);
  const tallaSeleccionada = select.value;

  if (!tallaSeleccionada) {
    Swal.fire("Selecciona una talla", "Por favor elige una talla antes de agregar al carrito.", "warning");
    return;
  }

  const existing = state.cart.find(p => p.id === id && p.talla === tallaSeleccionada);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ ...prod, talla: tallaSeleccionada, qty: 1 });
  }

  updateCartCount();
  renderDrawerCart();

  Swal.fire({
    title: 'Producto agregado',
    text: `${prod.nombre} (Talla ${tallaSeleccionada}) añadido al carrito`,
    icon: 'success',
    timer: 1500,
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
  renderDrawerCart();
  updateCartCount();
};

function updateCartCount() {
  const totalQty = state.cart.reduce((a, b) => a + b.qty, 0);
  document.getElementById("cartCount").textContent = totalQty;
}

function changeQty(id, talla, delta) {
  const item = state.cart.find(p => p.id === id && p.talla === talla);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter(p => !(p.id === id && p.talla === talla));
  }
  updateCartCount();
  renderDrawerCart();
}

function renderDrawerCart() {
  const cont = document.getElementById("cartItemsDrawer");
  cont.innerHTML = "";
  let subtotal = 0;

  if (state.cart.length === 0) {
    cont.innerHTML = `<p style="text-align:center;color:#666;">Tu carrito está vacío 🛒</p>`;
  } else {
    state.cart.forEach(p => {
      const sub = p.precio * p.qty;
      subtotal += sub;
      cont.innerHTML += `
        <li class="cart-item">
          <div>
            <div class="name">${p.nombre}</div>
            <div class="price">$${fmtCOP(p.precio)} c/u — Talla: ${p.talla}</div>
          </div>
          <div class="qty">
            <button onclick="changeQty('${p.id}','${p.talla}', -1)">−</button>
            <span>${p.qty}</span>
            <button onclick="changeQty('${p.id}','${p.talla}', 1)">+</button>
          </div>
        </li>`;
    });
  }

  const total = subtotal;
  document.getElementById("subtotalDrawer").textContent = fmtCOP(subtotal);
  document.getElementById("totalDrawer").textContent = fmtCOP(total);
}

/******************************
 * NAVEGACIÓN ENTRE VISTAS
 ******************************/
function show(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// Botón CONTINUAR → va al formulario
document.getElementById("btnContinuarPedido").onclick = () => {
  if (state.cart.length === 0) {
    Swal.fire("Tu carrito está vacío", "Agrega productos antes de continuar.", "warning");
    return;
  }

  const resumen = state.cart.map(p => `${p.qty}× ${p.nombre} (Talla ${p.talla})`).join(" | ");
  const subtotal = state.cart.reduce((a, b) => a + b.precio * b.qty, 0);

  document.getElementById("resumenProducto").textContent =
    `🛍 ${resumen} — Subtotal: $${fmtCOP(subtotal)}`;

  show("viewForm");
  document.getElementById("drawerCarrito").classList.remove("open");
};

/******************************
 * INTEGRACIONES
 ******************************/
function generarReferencia(idProducto) {
  const timestamp = Date.now();
  return `pedido_${timestamp}_${idProducto}`;
}

async function iniciarPagoWompi(idProducto, monto) {
  const referencia = generarReferencia(idProducto);
  try {
    const response = await fetch(`${WOMPI_BACKEND}?reference=${referencia}&amount=${monto}`);
    const wompiUrl = await response.text();
    window.location.href = wompiUrl;
  } catch (err) {
    Swal.fire("Error", "No se pudo generar el enlace de pago.", "error");
    console.error("Error Wompi:", err);
  }
}

function enviarWhatsApp(mensaje) {
  window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`, "_blank");
}

/******************************
 * FORMULARIO DE PEDIDO
 ******************************/
document.getElementById("btnVolver").onclick = () => show("viewCatalog");

document.getElementById("btnConfirmarPedido").onclick = () => {
  const nombre = document.getElementById("nombreCliente").value.trim();
  const telefono = document.getElementById("telefonoCliente").value.trim();
  const direccion = document.getElementById("direccionCliente").value.trim();
  const barrio = document.getElementById("barrioCliente").value.trim();

  if (!nombre || !telefono || !direccion || !barrio) {
    Swal.fire("Campos incompletos", "Por favor completa todos los datos antes de continuar.", "warning");
    return;
  }

  const total = state.cart.reduce((a, b) => a + b.precio * b.qty, 0);
  const resumen = state.cart.map(p => `${p.qty}× ${p.nombre} (Talla ${p.talla})`).join("\n");
  document.getElementById("resumenProducto").textContent =
    `🧾 Pedido de ${nombre}\n${resumen}\n💰 Total: $${fmtCOP(total)}`;

  document.getElementById("metodosPago").style.display = "flex";
  document.getElementById("btnConfirmarPedido").disabled = true;
  Swal.fire("Datos confirmados", "Elige cómo deseas continuar con el pago.", "success");
};

document.getElementById("btnPagarWompi").onclick = async () => {
  const nombre = document.getElementById("nombreCliente").value.trim();
  const telefono = document.getElementById("telefonoCliente").value.trim();
  const direccion = document.getElementById("direccionCliente").value.trim();
  const barrio = document.getElementById("barrioCliente").value.trim();

  const total = state.cart.reduce((a, b) => a + b.precio * b.qty, 0);
  const detallePedido = state.cart.map(p => `${p.qty}× ${p.nombre} (Talla ${p.talla})`).join(", ");

  const reference = `pedido_${Date.now()}_${state.cart[0].id}`;

  try {
    // 1️⃣ Guardar el pedido en la hoja
    await fetch(WOMPI_BACKEND + "?saveOrder=true", {
      method: "POST",
      body: JSON.stringify({
        reference,
        nombre,
        telefono,
        direccion,
        barrio,
        detallePedido,
        total
      })
    });

    // 2️⃣ Redirigir a Wompi
    const response = await fetch(`${WOMPI_BACKEND}?reference=${reference}&amount=${total}`);
    const wompiUrl = await response.text();
    window.location.href = wompiUrl;

  } catch (error) {
    Swal.fire("Error", "No se pudo registrar el pedido o generar el pago.", "error");
    console.error("Error:", error);
  }
};


document.getElementById("btnConfirmarWhatsapp").onclick = () => {
  const nombre = document.getElementById("nombreCliente").value.trim();
  const telefono = document.getElementById("telefonoCliente").value.trim();
  const direccion = document.getElementById("direccionCliente").value.trim();
  const barrio = document.getElementById("barrioCliente").value.trim();
  const total = state.cart.reduce((a, b) => a + b.precio * b.qty, 0);

  const mensaje =
    `🧾 *Pedido de ${nombre}*\n📞 ${telefono}\n📍 ${direccion}, ${barrio}\n\n` +
    state.cart.map(p => `• ${p.qty}× ${p.nombre} (Talla ${p.talla})`).join("\n") +
    `\n\n💰 *Total:* $${fmtCOP(total)}\n\nGracias por tu compra 💐`;

  enviarWhatsApp(mensaje);
};

/******************************
 * CARGA INICIAL
 ******************************/
init();
