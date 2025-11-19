/******************************
 * CONFIGURACIÓN GENERAL
 ******************************/

// 🛑 ATENCIÓN: Reemplaza esto con la URL de tu Google Apps Script implementado
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw7fxSI1ThW9yK2ybfpI9lERFBcuMe-gQPTftek7kBYyLMGyvlXRbiciSkTFgHRMhTm/exec"; 

const state = {
    catalogo: [], // Almacenará todos los productos
    editingId: null, // ID del producto que se está editando
};

// Función de formato de moneda (asumiendo que viene de tu script.js)
const fmtCOP = v => Number(v || 0).toLocaleString('es-CO');

/******************************
 * INICIALIZACIÓN
 ******************************/

async function init() {
    document.getElementById("listaProductos").innerHTML = '';

    try {
        // Cambiado de action=read a action=getCatalog (según tu Apps Script)
        const res = await fetch(SCRIPT_URL + '?action=getCatalog'); 
        const result = await res.json();
        
        // El Apps Script devuelve un array directo, NO { catalogo: [] }
        if (Array.isArray(result)) {
            state.catalogo = result.sort((a, b) => a.id.localeCompare(b.id)); 
            renderProducts(state.catalogo);
        } else {
            document.getElementById("listaProductos").innerHTML = 
                '<p class="error-msg">❌ Error al cargar el catálogo. Asegúrate que tu Apps Script retorna el array de productos.</p>';
        }
    } catch (error) {
        console.error("Error al cargar datos:", error);
        Swal.fire("Error", "No se pudo cargar el catálogo desde el servidor.", "error");
    }
}

/******************************
 * RENDERIZADO, BUSCADOR, Y LÓGICA DEL FORMULARIO (Sin cambios mayores)
 ******************************/

function renderProducts(products) {
    const grid = document.getElementById("listaProductos");
    grid.innerHTML = "";

    if (products.length === 0) {
        grid.innerHTML = '<p class="info-msg">No se encontraron productos que coincidan con la búsqueda.</p>';
        return;
    }

    products.forEach(prod => {
        // Usamos prod.imagen para coincidir con el nombre de columna en tu Apps Script/Sheet
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


function limpiarFormulario() {
    document.getElementById("id").value = "";
    document.getElementById("nombre").value = "";
    document.getElementById("precio").value = "";
    document.getElementById("tallas").value = "";
    document.getElementById("imgURL").value = "";
    document.getElementById("formTitle").textContent = "➕ Agregar / Editar Producto";
    state.editingId = null;
    document.getElementById("id").disabled = true; 
}

function generarNuevoId() {
    if (state.catalogo.length === 0) return "P001";
    
    // Obtener el último ID y extraer el número
    const lastProduct = state.catalogo.slice(-1)[0]; 
    const lastIdNumber = parseInt(lastProduct.id.replace('P', '')) || 0;
    
    // Incrementar y formatear
    const newIdNumber = lastIdNumber + 1;
    return 'P' + newIdNumber.toString().padStart(3, '0');
}


function editarProducto(id) {
    const prod = state.catalogo.find(p => p.id === id);
    if (!prod) return Swal.fire("Error", "Producto no encontrado.", "error");

    // Llenar el formulario. Usamos 'imagen' para el campo de URL
    document.getElementById("id").value = prod.id;
    document.getElementById("nombre").value = prod.nombre;
    document.getElementById("precio").value = prod.precio;
    document.getElementById("tallas").value = prod.tallas;
    document.getElementById("imgURL").value = prod.imagen; // ATENCIÓN: Usamos 'imagen'

    state.editingId = id;
    document.getElementById("formTitle").textContent = `✏️ Editando: ${prod.nombre}`;
}

/******************************
 * ENVÍO DE DATOS A APPS SCRIPT (AJUSTADO PARA JSON)
 ******************************/

async function guardarProducto() {
    const nombre = document.getElementById("nombre").value.trim();
    const precio = document.getElementById("precio").value.trim();
    const tallas = document.getElementById("tallas").value.trim();
    const imagen = document.getElementById("imgURL").value.trim(); // Se renombra a 'imagen'
    
    if (!nombre || !precio || !tallas || !imagen) {
        return Swal.fire("Campos incompletos", "Por favor, completa todos los campos requeridos.", "warning");
    }
    
    const isNew = !state.editingId;
    const productoId = isNew ? generarNuevoId() : state.editingId;

    // 🛑 Crear el objeto de datos JSON (IMPORTANTE)
    const payload = {
        id: productoId,
        nombre: nombre,
        precio: parseInt(precio),
        tallas: tallas,
        imagen: imagen, // Nombre del campo ajustado a 'imagen'
    };

    const action = isNew ? 'addProduct' : 'updateProduct'; // Acción según tu Apps Script
    
    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.textContent = isNew ? "Creando..." : "Actualizando...";

    try {
        const response = await fetch(SCRIPT_URL + `?action=${action}`, {
            method: 'POST',
            // 🛑 Usar JSON para el Apps Script
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload), // Envía el objeto JSON
        });
        const result = await response.json();

        if (result.success === true) {
            Swal.fire(
                isNew ? "Creado con éxito" : "Actualizado con éxito",
                `El producto ${nombre} ha sido ${isNew ? 'creado' : 'actualizado'} correctamente.`, 
                "success"
            );
            limpiarFormulario();
            await init(); // Recargar el catálogo
        } else {
            Swal.fire("Error del servidor", result.error || "No se pudo completar la operación.", "error");
        }

    } catch (error) {
        console.error("Error de red:", error);
        Swal.fire("Error de Conexión", "No se pudo contactar al servidor de Apps Script.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "💾 Guardar Producto";
    }
}

async function eliminarProducto(id) {
    const prod = state.catalogo.find(p => p.id === id);
    if (!prod) return;

    Swal.fire({
        title: `¿Eliminar ${prod.nombre}?`,
        text: "Esta acción es irreversible.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: '#CC0000',
        cancelButtonColor: '#777777',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            
            // 🛑 Enviar ID como JSON en el cuerpo para la acción de Apps Script
            const payload = { id: id };
            
            try {
                const response = await fetch(SCRIPT_URL + '?action=deleteProduct', {
                    method: 'POST',
                    // 🛑 Usar JSON para el Apps Script
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const result = await response.json();

                if (result.success === true) {
                    Swal.fire("Eliminado", `El producto ${prod.nombre} ha sido eliminado.`, "success");
                    await init(); // Recargar el catálogo
                } else {
                    Swal.fire("Error del servidor", result.error || "No se pudo eliminar el producto.", "error");
                }
            } catch (error) {
                Swal.fire("Error de Conexión", "No se pudo contactar al servidor.", "error");
            }
        }
    });
}

// === CARGA INICIAL ===
document.addEventListener('DOMContentLoaded', init);