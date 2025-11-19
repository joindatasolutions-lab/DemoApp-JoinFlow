/******************************
 * CONFIGURACIÓN GENERAL
 ******************************/

// 🛑 ATENCIÓN: Reemplaza esto con la URL de tu Google Apps Script implementado
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw7fxSI1ThW9yK2ybfpI9lERFBcuMe-gQPTftek7kBYyLMGyvlXRbiciSkTFgHRMhTm/exec"; 

const state = {
    catalogo: [], // Almacenará todos los productos
    editingId: null, // ID del producto que se está editando
};

// Función de formato de moneda 
const fmtCOP = v => Number(v || 0).toLocaleString('es-CO');

/******************************
 * HELPERS DE UI
 ******************************/

function openDrawer() {
    document.getElementById("productDrawer").classList.add("open");
}

function closeDrawer() {
    document.getElementById("productDrawer").classList.remove("open");
}

function updateImagePreview(url) {
    const imgElement = document.getElementById("imagePreview");
    const placeholder = document.getElementById("previewPlaceholder");

    if (url && url.trim()) {
        imgElement.src = url.trim();
        imgElement.style.display = "block";
        placeholder.style.display = "none";
    } else {
        imgElement.src = "";
        imgElement.style.display = "none";
        placeholder.style.display = "block";
    }
}

/******************************
 * INICIALIZACIÓN
 ******************************/

async function init() {
    document.getElementById("listaProductos").innerHTML = '';

    try {
        const res = await fetch(SCRIPT_URL + '?action=getCatalog'); 
        const result = await res.json();
        
        if (Array.isArray(result)) {
            state.catalogo = result.sort((a, b) => a.id.localeCompare(b.id)); 
            renderProducts(state.catalogo);
        } else {
            document.getElementById("listaProductos").innerHTML = 
                '<p class="error-msg">❌ Error al cargar el catálogo. Verifica la URL y la respuesta de tu Apps Script.</p>';
        }
    } catch (error) {
        console.error("Error al cargar datos:", error);
        Swal.fire("Error", "No se pudo cargar el catálogo desde el servidor. Revisa tu conexión y el Apps Script.", "error");
    }
}

/******************************
 * RENDERIZADO Y BUSCADOR
 ******************************/

function renderProducts(products) {
    const grid = document.getElementById("listaProductos");
    grid.innerHTML = "";

    if (products.length === 0) {
        grid.innerHTML = '<p class="info-msg">No se encontraron productos que coincidan con la búsqueda.</p>';
        return;
    }

    products.forEach(prod => {
        const imgUrl = prod.imagen || 'img/placeholder.jpg'; 

        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <img src="${imgUrl}" class="product-image" alt="${prod.nombre}">
            <div class="card-body">
                <div>
                    <span class="id">ID: ${prod.id}</span>
                    <h3>${prod.nombre}</h3>
                    <div class="price">$${fmtCOP(prod.precio)}</div>
                    <div class="tallas">Tallas: ${prod.tallas || 'N/A'}</div>
                </div>
                <div class="card-actions">
                    <button onclick="editarProducto('${prod.id}')" class="btn btn-edit">✏️ Editar</button>
                    <button onclick="eliminarProducto('${prod.id}')" class="btn btn-delete">🗑️ Eliminar</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

document.getElementById("search").addEventListener("input", function(e) {
    const query = e.target.value.toLowerCase().trim();
    if (query === "") {
        renderProducts(state.catalogo);
        return;
    }
    const filtered = state.catalogo.filter(p =>
        p.nombre.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)
    );
    renderProducts(filtered);
});

/******************************
 * MANEJO DEL FORMULARIO
 ******************************/

function generarNuevoId() {
    if (state.catalogo.length === 0) return "P001";
    
    // Obtener el ID numérico más alto y sumar 1
    const maxIdNumber = state.catalogo.reduce((max, p) => {
        const num = parseInt(p.id.replace('P', '')) || 0;
        return num > max ? num : max;
    }, 0);
    
    const newIdNumber = maxIdNumber + 1;
    return 'P' + newIdNumber.toString().padStart(3, '0');
}

/**
 * Función que limpia el formulario y cierra el Drawer (Usada por el botón Cancelar/Cerrar)
 */
function limpiarFormulario() {
    // 1. Cierra el panel lateral
    closeDrawer(); 
    
    // 2. Limpia los campos
    document.getElementById("id").value = "";
    document.getElementById("nombre").value = "";
    document.getElementById("precio").value = "";
    document.getElementById("tallas").value = "";
    document.getElementById("imgURL").value = "";
    
    // 3. Restablece el estado de edición
    document.getElementById("formTitle").textContent = "➕ Agregar Nuevo Producto";
    state.editingId = null;
    
    // 4. Limpia la previsualización
    updateImagePreview(""); 
}

/**
 * Función que abre el formulario para crear un nuevo producto (Usada por el botón Agregar Nuevo)
 */
function startNewProduct() {
    // 1. Limpia cualquier estado de edición anterior
    limpiarFormulario(); 
    // 2. Abre el drawer
    openDrawer();
    // 3. El ID ya fue limpiado y reseteado en limpiarFormulario
    document.getElementById("formTitle").textContent = "➕ Agregar Nuevo Producto";
}


function editarProducto(id) {
    const prod = state.catalogo.find(p => p.id === id);
    if (!prod) return Swal.fire("Error", "Producto no encontrado.", "error");

    // Llenar el formulario.
    document.getElementById("id").value = prod.id;
    document.getElementById("nombre").value = prod.nombre;
    document.getElementById("precio").value = prod.precio;
    document.getElementById("tallas").value = prod.tallas;
    document.getElementById("imgURL").value = prod.imagen; 
    
    // Mostrar la imagen en la previsualización
    updateImagePreview(prod.imagen);

    state.editingId = id;
    document.getElementById("formTitle").textContent = `✏️ Editando: ${prod.nombre}`;
    
    // Abrir el panel lateral
    openDrawer();
}

/******************************
 * ENVÍO DE DATOS (CRUD)
 ******************************/

// Listener para previsualización de imagen al escribir
document.getElementById("imgURL").addEventListener("input", function(e) {
    updateImagePreview(e.target.value);
});


async function guardarProducto() {
    // Validar campos obligatorios
    const nombre = document.getElementById("nombre").value.trim();
    const precio = document.getElementById("precio").value.trim();
    const tallas = document.getElementById("tallas").value.trim();
    const imagen = document.getElementById("imgURL").value.trim();
    
    if (!nombre || !precio || !tallas || !imagen) {
        return Swal.fire("Campos incompletos", "Por favor, completa todos los campos requeridos.", "warning");
    }
    
    const isNew = !state.editingId;
    const productoId = isNew ? generarNuevoId() : state.editingId;

    const payload = {
        id: productoId,
        nombre: nombre,
        precio: parseInt(precio),
        tallas: tallas,
        imagen: imagen, 
    };

    const action = isNew ? 'addProduct' : 'updateProduct';
    
    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.textContent = isNew ? "Creando..." : "Actualizando...";

    try {
        const response = await fetch(SCRIPT_URL + `?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (result.success === true) {
            Swal.fire(
                isNew ? "Creado con éxito" : "Actualizado con éxito",
                `El producto ${nombre} ha sido ${isNew ? 'creado' : 'actualizado'} correctamente.`, 
                "success"
            );
            limpiarFormulario(); // Cierra el drawer y limpia
            await init(); // Recargar el catálogo
        } else {
            Swal.fire("Error del servidor", result.error || "No se pudo completar la operación.", "error");
        }

    } catch (error) {
        console.error("Error de red:", error);
        Swal.fire("Error de Conexión", "No se pudo contactar al servidor de Apps Script. Verifica la URL.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "💾 Guardar Producto";
    }
}

async function eliminarProducto(id) {
    const prod = state.catalogo.find(p => p.id === id);
    if (!prod) return;

    Swal.fire({
        title: `¿Eliminar ${prod.nombre} (${id})?`,
        text: "Esta acción es irreversible y eliminará el producto de la base de datos.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: '#CC0000',
        cancelButtonColor: '#777777',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            
            const payload = { id: id };
            
            try {
                const response = await fetch(SCRIPT_URL + '?action=deleteProduct', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const result = await response.json();

                if (result.success === true) {
                    Swal.fire("Eliminado", `El producto ${prod.nombre} ha sido eliminado.`, "success");
                    limpiarFormulario();
                    await init(); // Recargar el catálogo
                } else {
                    Swal.fire("Error del servidor", result.error || "No se pudo eliminar el producto.", "error");
                }
            } catch (error) {
                Swal.fire("Error de Conexión", "No se pudo contactar al servidor. Verifica la URL.", "error");
            }
        }
    });
}

// === CARGA INICIAL ===
document.addEventListener('DOMContentLoaded', init);