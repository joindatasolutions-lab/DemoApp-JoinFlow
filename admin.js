const API_URL = "TU_URL_API_AQUI"; 

async function cargarCatalogo() {
  const res = await fetch(`${API_URL}?action=getCatalog`);
  const data = await res.json();
  renderProductos(data);
}

function renderProductos(lista) {
  const cont = document.getElementById("listaProductos");
  cont.innerHTML = "";

  lista.forEach(p => {
    cont.innerHTML += `
      <div class="card">
        <img src="${p.imagen}">
        <h3>${p.nombre}</h3>
        <p><b>ID:</b> ${p.id}</p>
        <p><b>Precio:</b> $${p.precio}</p>
        <p><b>Tallas:</b> ${p.tallas}</p>

        <button onclick="editar(${encodeURIComponent(JSON.stringify(p))})" class="btn-edit">Editar</button>
        <button onclick="eliminar('${p.id}')" class="btn-delete">Eliminar</button>
      </div>
    `;
  });
}

function editar(prod) {
  const p = JSON.parse(decodeURIComponent(prod));

  document.getElementById("id").value = p.id;
  document.getElementById("nombre").value = p.nombre;
  document.getElementById("precio").value = p.precio;
  document.getElementById("tallas").value = p.tallas;
  document.getElementById("imagen").value = p.imagen;
}

async function guardarProducto() {
  const prod = {
    id: document.getElementById("id").value.trim(),
    nombre: document.getElementById("nombre").value.trim(),
    precio: Number(document.getElementById("precio").value),
    tallas: document.getElementById("tallas").value.trim(),
    imagen: document.getElementById("imagen").value.trim(),
  };

  if (!prod.id || !prod.nombre) {
    return Swal.fire("Faltan datos obligatorios");
  }

  const metodo = await existeID(prod.id) ? "updateProduct" : "addProduct";

  await fetch(`${API_URL}?action=${metodo}`, {
    method: "POST",
    body: JSON.stringify(prod)
  });

  Swal.fire("Guardado", "Producto actualizado", "success");
  cargarCatalogo();
}

async function existeID(id) {
  const res = await fetch(`${API_URL}?action=getCatalog`);
  const lista = await res.json();
  return lista.some(p => p.id === id);
}

async function eliminar(id) {
  const confirm = await Swal.fire({
    title: "¿Eliminar?",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    showCancelButton: true
  });

  if (!confirm.isConfirmed) return;

  await fetch(`${API_URL}?action=deleteProduct`, {
    method: "POST",
    body: JSON.stringify({ id })
  });

  Swal.fire("Eliminado", "", "success");
  cargarCatalogo();
}

cargarCatalogo();
