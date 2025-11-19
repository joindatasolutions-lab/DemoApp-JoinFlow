/******************************
 * CONFIGURACIÓN GENERAL
 ******************************/

// 🛑 ATENCIÓN: Reemplaza esto con la URL de tu Google Apps Script implementado
const SCRIPT_URL = "LA URL COMPLETA DE TU APPS SCRIPT"; 

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

/**
 * Muestra la imagen de previsualización. Maneja URL de Drive o archivo local (Blob URL).
 */
function updateImagePreview(url, isLocalFile = false) {
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
    // Si se cargó una URL de Blob para un archivo local, debe ser revocada al limpiar.
    if (!isLocalFile && imgElement.dataset.localUrl) {
        URL.revokeObjectURL(imgElement.dataset.localUrl);
        delete imgElement.dataset.localUrl;
    }
}

/**
 * Maneja la previsualización de la imagen seleccionada localmente.
 */
function previewLocalImage(event) {
    const file = event.target.files[0];
    if (file) {
        const localUrl = URL.createObjectURL(file);
        updateImagePreview(localUrl, true);
        
        // Guardar la URL local para revocarla después
        document.getElementById("imagePreview").dataset.localUrl = localUrl;
        document.getElementById("previewPlaceholder").textContent = `Archivo seleccionado: ${file.name}`;
        
        // Limpiar el campo oculto de la URL existente (se subirá una nueva)
        document.getElementById("imgURL").value = "";
    } else {
        // Si el usuario cancela la selección, limpiar la previsualización.
        updateImagePreview(document.getElementById("imgURL").value);
        document.getElementById("previewPlaceholder").textContent = "URL de imagen: Ninguna";
    }
}

/******************************
 * INICIALIZACIÓN Y RENDER
 ******************************/

async function init() {
    document.getElementById("listaProductos").innerHTML = '';
    // ... (Tu lógica de init() para cargar catálogo sin cambios) ...
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

function renderProducts(products) {
    // ... (Tu lógica de renderProducts() sin cambios) ...
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
 * MANEJO DEL FORMULARIO Y EDICIÓN
 ******************************/

function generarNuevoId() {
    // ... (Tu lógica de generarNuevoId() sin cambios) ...
    if (state.catalogo.length === 0) return "P001";
    
    const maxIdNumber = state.catalogo.reduce((max, p) => {
        const num = parseInt(p.id.replace('P', '')) || 0;
        return num > max ? num : max;
    }, 0);
    
    const newIdNumber = maxIdNumber + 1;
    return 'P' + newIdNumber.toString().padStart(3, '0');
}

function limpiarFormulario() {
    closeDrawer(); 
    
    // 🛑 LIMPIAR TODOS LOS CAMPOS
    document.getElementById("id").value = "";
    document.getElementById("nombre").value = "";
    document.getElementById("precio").value = "";
    document.getElementById("tallas").value = "";
    document.getElementById("imgURL").value = ""; // Limpiar el campo oculto
    document.getElementById("productImageFile").value = ""; // Limpiar el input file
    
    document.getElementById("formTitle").textContent = "➕ Agregar Nuevo Producto";
    state.editingId = null;
    
    updateImagePreview(""); // Limpiar la previsualización
    document.getElementById("previewPlaceholder").textContent = "URL de imagen: Ninguna";
}

function startNewProduct() {
    limpiarFormulario(); 
    openDrawer();
    document.getElementById("formTitle").textContent = "➕ Agregar Nuevo Producto";
}


function editarProducto(id) {
    const prod = state.catalogo.find(p => p.id === id);
    if (!prod) return Swal.fire("Error", "Producto no encontrado.", "error");

    // Llenar los campos
    document.getElementById("id").value = prod.id;
    document.getElementById("nombre").value = prod.nombre;
    document.getElementById("precio").value = prod.precio;
    document.getElementById("tallas").value = prod.tallas;
    
    // 🛑 GESTIÓN DE IMAGEN EN EDICIÓN
    document.getElementById("imgURL").value = prod.imagen; // Cargar la URL existente al campo oculto
    document.getElementById("productImageFile").value = ""; // Asegurar que el input de archivo esté vacío
    updateImagePreview(prod.imagen); // Mostrar la imagen actual
    document.getElementById("previewPlaceholder").textContent = "URL de imagen: Actual";

    state.editingId = id;
    document.getElementById("formTitle").textContent = `✏️ Editando: ${prod.nombre}`;
    
    openDrawer();
}

/******************************
 * LÓGICA DE SUBIDA DE IMAGEN A DRIVE (NUEVA)
 ******************************/

/**
 * Convierte un archivo a Base64 y lo envía al Apps Script para guardar en Drive.
 * @param {File} file - El objeto File seleccionado.
 * @returns {Promise<string|null>} La URL pública de Drive o null si falla.
 */
async function uploadImageAndGetUrl(file) {
    // Límite de 5MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024; 
    if (file.size > MAX_FILE_SIZE) {
        Swal.fire("Error", "El archivo es demasiado grande (máx 5MB).", "error");
        return null;
    }
    
    const reader = new FileReader();
    
    // Usar una Promesa para esperar a que la lectura del archivo termine
    const base64Data = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result.split(',')[1]); // Solo la parte Base64
        reader.readAsDataURL(file);
    });

    try {
        const uploadResponse = await fetch(SCRIPT_URL + '?action=uploadFile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: base64Data,
                mimeType: file.type,
                fileName: file.name
            }),
        });

        const result = await uploadResponse.json();

        if (result.success && result.url) {
            return result.url; // La URL pública de Google Drive
        } else {
            Swal.fire("Error de Subida", result.error || "No se pudo subir el archivo al Drive. Revise el Apps Script.", "error");
            return null;
        }
    } catch (error) {
        console.error("Error de red durante la subida:", error);
        Swal.fire("Error de Conexión", "No se pudo contactar al servidor para subir la imagen.", "error");
        return null;
    }
}


/******************************
 * ENVÍO DE DATOS (CRUD)
 ******************************/

async function guardarProducto() {
    const nombre = document.getElementById("nombre").value.trim();
    const precio = document.getElementById("precio").value.trim();
    const tallas = document.getElementById("tallas").value.trim();
    
    const fileInput = document.getElementById("productImageFile");
    const file = fileInput.files[0];
    const hiddenImgURL = document.getElementById("imgURL");
    
    let finalImageUrl = hiddenImgURL.value.trim(); // URL actual de Drive (si es edición sin cambio)
    
    // Validar campos de texto
    if (!nombre || !precio || !tallas) {
        return Swal.fire("Campos incompletos", "Por favor, completa Nombre, Precio y Tallas.", "warning");
    }

    // Validar imagen
    if (!file && !finalImageUrl) {
        return Swal.fire("Imagen Requerida", "Debes seleccionar una imagen o tener una URL existente (en modo edición).", "warning");
    }
    
    const isNew = !state.editingId;
    const productoId = isNew ? generarNuevoId() : state.editingId;

    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.textContent = isNew ? "Creando..." : "Actualizando...";


    // 🛑 PASO 1: Subir la nueva imagen si se seleccionó un archivo
    if (file) {
        btn.textContent = "Subiendo imagen...";
        const uploadedUrl = await uploadImageAndGetUrl(file);
        
        if (!uploadedUrl) {
            btn.disabled = false;
            btn.textContent = "💾 Guardar Producto";
            return; // Falló la subida, detener proceso.
        }
        finalImageUrl = uploadedUrl;
    }

    // 🛑 PASO 2: Guardar los metadatos del producto
    const payload = {
        id: productoId,
        nombre: nombre,
        precio: parseInt(precio),
        tallas: tallas,
        imagen: finalImageUrl, // Usamos la URL nueva o la existente
    };

    const action = isNew ? 'addProduct' : 'updateProduct';
    btn.textContent = isNew ? "Guardando producto..." : "Actualizando producto...";

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
            limpiarFormulario();
            await init(); 
        } else {
            Swal.fire("Error del servidor", result.error || "No se pudo completar la operación.", "error");
        }

    } catch (error) {
        console.error("Error de red:", error);
        Swal.fire("Error de Conexión", "Hubo un problema de conexión al guardar los datos.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "💾 Guardar Producto";
    }
}

// ... (eliminarProducto y CARGA INICIAL sin cambios) ...

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