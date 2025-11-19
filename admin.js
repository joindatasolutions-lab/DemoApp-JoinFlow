/******************************
 * CONFIGURACIÓN GENERAL
 ******************************/

// 🛑 ATENCIÓN: Esta URL es un placeholder basado en tu script.js. 
// Asegúrate de que tu Google Apps Script de administración esté configurado para manejar 
// peticiones GET (leer) y POST (crear/actualizar/eliminar).
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyugA-riUX-0YED15RpEAEKzPlAPhS6I9V_EnEhvrz32lqs8R5TJ02aAlfs7nlw_PB2/exec"; 

const state = {
    catalogo: [], // Almacenará todos los productos
    editingId: null, // ID del producto que se está editando
};

const fmtCOP = v => Number(v || 0).toLocaleString('es-CO');

/******************************
 * INICIALIZACIÓN
 ******************************/

async function init() {
    // 🧹 Limpiar el placeholder de carga
    document.getElementById("listaProductos").innerHTML = '';

    try {
        const res = await fetch(SCRIPT_URL + '?action=read'); // Pedir todos los productos
        const data = await res.json();
        
        if (data && Array.isArray(data.catalogo)) {
            state.catalogo = data.catalogo.sort((a, b) => a.id.localeCompare(b.id)); // Ordenar por ID
            renderProducts(state.catalogo);
        } else {
            document.getElementById("listaProductos").innerHTML = 
                '<p class="error-msg">❌ Error al cargar el catálogo o catálogo vacío. Asegúrate de que el Apps Script retorne un array de productos.</p>';
        }
    } catch (error) {
        console.error("Error al cargar datos:", error);
        Swal.fire("Error", "No se pudo cargar el catálogo desde el servidor.", "error");
    }
}

/******************************
 * RENDERIZADO DEL CATÁLOGO
 ******************************/

function renderProducts(products) {
    const grid = document.getElementById("listaProductos");
    grid.innerHTML = "";

    if (products.length === 0) {
        grid.innerHTML = '<p class="info-msg">No se encontraron productos que coincidan con la búsqueda.</p>';
        return;
    }

    products.forEach(prod => {
        // Asegurar que las URLs de imagen tengan un valor por defecto si están vacías
        const imgUrl = prod.img || 'img/placeholder.jpg'; 

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

/******************************
 * BUSCADOR
 ******************************/

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
 * LÓGICA DEL FORMULARIO
 ******************************/

function limpiarFormulario() {
    document.getElementById("id").value = "";
    document.getElementById("nombre").value = "";
    document.getElementById("precio").value = "";
    document.getElementById("tallas").value = "";
    document.getElementById("imgURL").value = "";
    document.getElementById("formTitle").textContent = "➕ Agregar / Editar Producto";
    state.editingId = null;
    document.getElementById("id").disabled = true; // El ID debe ser inhabilitado por defecto
}

function generarNuevoId() {
    // Si el catálogo está vacío, empieza en P001
    if (state.catalogo.length === 0) return "P001";
    
    // Encuentra el ID más grande numéricamente (Ej: P099)
    const lastProduct = state.catalogo[state.catalogo.length - 1];
    
    // Intenta parsear el número del último ID (Ej: de "P099" obtiene 99)
    const lastIdNumber = parseInt(lastProduct.id.replace('P', '')) || 0;
    
    // Genera el nuevo ID (Ej: 100) y lo formatea a 3 dígitos (Ej: "P100")
    const newIdNumber = lastIdNumber + 1;
    return 'P' + newIdNumber.toString().padStart(3, '0');
}


function editarProducto(id) {
    const prod = state.catalogo.find(p => p.id === id);
    if (!prod) return Swal.fire("Error", "Producto no encontrado.", "error");

    // Llenar el formulario
    document.getElementById("id").value = prod.id;
    document.getElementById("nombre").value = prod.nombre;
    document.getElementById("precio").value = prod.precio;
    document.getElementById("tallas").value = prod.tallas;
    document.getElementById("imgURL").value = prod.img;
    
    // Actualizar estado de edición y título
    state.editingId = id;
    document.getElementById("formTitle").textContent = `✏️ Editando: ${prod.nombre}`;
}

async function guardarProducto() {
    const nombre = document.getElementById("nombre").value.trim();
    const precio = document.getElementById("precio").value.trim();
    const tallas = document.getElementById("tallas").value.trim();
    const img = document.getElementById("imgURL").value.trim();
    
    if (!nombre || !precio || !tallas || !img) {
        return Swal.fire("Campos incompletos", "Por favor, completa todos los campos requeridos.", "warning");
    }
    
    const isNew = !state.editingId;
    const productoId = isNew ? generarNuevoId() : state.editingId;

    const data = {
        action: isNew ? 'create' : 'update',
        id: productoId,
        nombre: nombre,
        precio: parseInt(precio),
        tallas: tallas,
        img: img,
    };

    const formData = new FormData();
    for (const key in data) {
        formData.append(key, data[key]);
    }

    // Deshabilitar botón para evitar envíos duplicados
    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.textContent = isNew ? "Creando..." : "Actualizando...";

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();

        if (result.status === 'success') {
            Swal.fire(
                isNew ? "Creado con éxito" : "Actualizado con éxito",
                `El producto ${nombre} ha sido ${isNew ? 'creado' : 'actualizado'} correctamente.`, 
                "success"
            );
            limpiarFormulario();
            await init(); // Recargar el catálogo
        } else {
            Swal.fire("Error del servidor", result.message || "No se pudo completar la operación.", "error");
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
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('id', id);

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();

                if (result.status === 'success') {
                    Swal.fire("Eliminado", `El producto ${prod.nombre} ha sido eliminado.`, "success");
                    await init(); // Recargar el catálogo
                } else {
                    Swal.fire("Error del servidor", result.message || "No se pudo eliminar el producto.", "error");
                }
            } catch (error) {
                Swal.fire("Error de Conexión", "No se pudo contactar al servidor.", "error");
            }
        }
    });
}

// === CARGA INICIAL ===
document.addEventListener('DOMContentLoaded', init);