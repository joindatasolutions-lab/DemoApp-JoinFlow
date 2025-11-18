const API_URL = "TU_URL_API_AQUI"; 
const FORM_TITLE = "Agregar / Editar Producto";

async function cargarCatalogo() {
  const res = await fetch(`${API_URL}?action=getCatalog`);
  const data = await res.json();
  renderProductos(data);
}

// Función para formatear el precio a moneda local (Colombia, sin decimales)
function formatPrecio(precio) {
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP',
    minimumFractionDigits: 0 
  }).format(precio);
}

function renderProductos(lista) {
  const cont = document.getElementById("listaProductos");
  cont.innerHTML = "";

  lista.forEach(p => {
    // Formatear el precio para la vista de catálogo
    const precioFormateado = formatPrecio(p.precio);

    cont.innerHTML += `
      <div class="card">
        <img src="${p.imagen}">
        <h3>${p.nombre}</h3>
        <p><b>ID:</b> ${p.id}</p>
        <p><b>Precio:</b> ${precioFormateado}</p>
        <p><b>Tallas:</b> ${p.tallas}</p>

        <button onclick="editar(${encodeURIComponent(JSON.stringify(p))})" class="btn-edit">Editar</button>
        <button onclick="eliminar('${p.id}')" class="btn-delete">Eliminar</button>
      </div>
    `;
  });
}

// Función para limpiar el formulario y restablecer el estado "Agregar"
function limpiarFormulario() {
  document.getElementById("id").value = "";
  document.getElementById("nombre").value = "";
  document.getElementById("precio").value = "";
  document.getElementById("tallas").value = "";
  document.getElementById("imagen").value = "";
  
  // Restablecer el título y habilitar el ID
  document.getElementById("formTitle").textContent = FORM_TITLE;
  document.getElementById("id").disabled = false;
}


function editar(prod) {
  const p = JSON.parse(decodeURIComponent(prod));

  // Cambiar el título para indicar el modo "Edición"
  document.getElementById("formTitle").textContent = `Editar Producto: ${p.nombre}`;

  document.getElementById("id").value = p.id;
  // Deshabilitar el ID para evitar que se cambie el identificador en edición
  document.getElementById("id").disabled = true; 
  
  document.getElementById("nombre").value = p.nombre;
  document.getElementById("precio").value = p.precio;
  document.getElementById("tallas").value = p.tallas;
  document.getElementById("imagen").value = p.imagen;
}

async function guardarProducto() {
  const prod = {
    // Si está en modo edición, toma el valor, si no está en modo edición se toma el nuevo ID
    id: document.getElementById("id").value.trim(), 
    nombre: document.getElementById("nombre").value.trim(),
    precio: Number(document.getElementById("precio").value),
    tallas: document.getElementById("tallas").value.trim(),
    imagen: document.getElementById("imagen").value.trim(),
  };

  if (!prod.id || !prod.nombre) {
    return Swal.fire("Faltan datos obligatorios", "Por favor, completa el ID y el Nombre del producto.", "error");
  }

  const modoEdicion = document.getElementById("id").disabled;
  const metodo = modoEdicion ? "updateProduct" : "addProduct";
  const mensaje = modoEdicion ? "Producto Actualizado exitosamente." : "Producto Agregado exitosamente.";
  
  // Deshabilitar el campo ID temporalmente para que no se envíe en el JSON si estaba deshabilitado
  document.getElementById("id").disabled = false; 

  await fetch(`${API_URL}?action=${metodo}`, {
    method: "POST",
    body: JSON.stringify(prod)
  });
  
  Swal.fire("¡Éxito!", mensaje, "success");
  
  // Limpiar y resetear el formulario después de guardar
  limpiarFormulario(); 

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
    showCancelButton: true,
    confirmButtonText: "Sí, Eliminar",
    cancelButtonText: "Cancelar"
  });

  if (!confirm.isConfirmed) return;

  await fetch(`${API_URL}?action=deleteProduct`, {
    method: "POST",
    body: JSON.stringify({ id })
  });

  Swal.fire("Eliminado", "El producto ha sido eliminado del catálogo.", "success");
  cargarCatalogo();
  limpiarFormulario(); // Limpiar el formulario en caso de que estuviera editando el producto eliminado
}

cargarCatalogo();