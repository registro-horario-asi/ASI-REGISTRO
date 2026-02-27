let editando = false;
let fotoBlob = null;
let stream = null;

const inputId = document.getElementById('newId');
const inputNombre = document.getElementById('newName');
const preview = document.getElementById('fotoBasePreview');
const btnPrincipal = document.getElementById('btnPrincipal');
const btnCancelar = document.getElementById('btnCancelar');

document.addEventListener('DOMContentLoaded', () => {
    cargarLista(); // Inicia la escucha de Firebase

    btnPrincipal.addEventListener('click', async () => {
        const id = inputId.value.trim();
        const nombre = inputNombre.value.trim().toUpperCase();
        const fileInput = document.getElementById('fotoBase').files[0];
        const imagenFinal = fileInput || fotoBlob;

        if (!id || !nombre || (!editando && !imagenFinal)) {
            mostrarMensaje("ID, Nombre y Foto son requeridos", "error");
            return;
        }

        btnPrincipal.disabled = true;
        btnPrincipal.innerText = "Procesando...";

        try {
            const data = {
                nombre: nombre,
                role: document.getElementById('role').value,
                horarioEntrada: document.getElementById('horarioEntrada').value,
                horarioSalida: document.getElementById('horarioSalida').value,
                comidaInicio: document.getElementById('comidaInicio').value,
                comidaFin: document.getElementById('comidaFin').value,
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (imagenFinal) {
                data.fotoBaseUrl = await subirCloudinary(imagenFinal, id);
            }

            if (editando) {
                await db.collection("empleados").doc(id).update(data);
                mostrarMensaje("Actualizado con éxito", "success");
            } else {
                const check = await db.collection("empleados").doc(id).get();
                if (check.exists) throw new Error("Ese ID ya está registrado");
                data.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("empleados").doc(id).set(data);
                mostrarMensaje("Guardado correctamente", "success");
            }
            limpiar();
        } catch (e) {
            mostrarMensaje(e.message, "error");
        } finally {
            btnPrincipal.disabled = false;
            btnPrincipal.innerText = editando ? "✅ Actualizar Empleado" : "➕ Agregar Empleado";
        }
    });

    document.getElementById('btnAbrirCamara').onclick = abrirCamara;
    document.getElementById('btnCerrarCamara').onclick = cerrarCamara;
    document.getElementById('btnCapturarFoto').onclick = capturarFoto;
    btnCancelar.onclick = limpiar;


    // Configura los botones del modal de borrado (pon esto dentro del DOMContentLoaded)
document.getElementById('btnConfirmDelete').onclick = async () => {
    if (idParaEliminar) {
        try {
            await db.collection("empleados").doc(idParaEliminar).delete();
            mostrarMensaje("Usuario eliminado", "success");
        } catch (e) {
            mostrarMensaje("Error al eliminar", "error");
        }
    }
    cerrarModalBorrado();
};
});

// --- LISTA EN TIEMPO REAL ---
function cargarLista() {
    db.collection("empleados").orderBy("nombre", "asc").onSnapshot(snap => {
        const tbody = document.getElementById('listaCuerpo');
        tbody.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${d.fotoBaseUrl || 'https://via.placeholder.com/50'}" class="img-tabla"></td>
                <td><b>${doc.id}</b></td>
                <td>${d.nombre}</td>
                <td>${d.horarioEntrada} - ${d.horarioSalida}</td>
                <td>${d.comidaInicio} - ${d.comidaFin}</td>
                <td><span style="color: ${d.role === 'admin' ? 'red' : 'blue'}">${d.role}</span></td>
                <td class="actions">
                    <button class="btn-edit" onclick="prepararEdicion('${doc.id}', ${JSON.stringify(d).replace(/"/g, '&quot;')})">✏️</button>
                    <button class="btn-del" onclick="eliminar('${doc.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// --- CLOUDINARY ---
async function subirCloudinary(file, id) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "web_upload");
    fd.append("folder", `empleados/${id}`);
    const res = await fetch("https://api.cloudinary.com/v1_1/dm4u2wuwr/image/upload", { method: "POST", body: fd });
    const resData = await res.json();
    return resData.secure_url;
}

// --- CÁMARA ---
async function abrirCamara() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        document.getElementById('userVideoStream').srcObject = stream;
        document.getElementById('cameraModal').style.display = 'flex';
    } catch (e) { mostrarMensaje("Error de cámara: " + e.message, "error"); }
}

function cerrarCamara() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    document.getElementById('cameraModal').style.display = 'none';
}

function capturarFoto() {
    const video = document.getElementById('userVideoStream');
    const canvas = document.getElementById('userSnapshotCanvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(b => {
        fotoBlob = b;
        preview.src = URL.createObjectURL(b);
        preview.style.display = 'block';
        cerrarCamara();
    }, 'image/jpeg');
}

// --- UTILS ---
function prepararEdicion(id, d) {
    editando = true;
    inputId.value = id; inputId.disabled = true;
    inputNombre.value = d.nombre;
    document.getElementById('role').value = d.role || "user";
    document.getElementById('horarioEntrada').value = d.horarioEntrada;
    document.getElementById('horarioSalida').value = d.horarioSalida;
    document.getElementById('comidaInicio').value = d.comidaInicio;
    document.getElementById('comidaFin').value = d.comidaFin;
    preview.src = d.fotoBaseUrl; preview.style.display = "block";
    btnPrincipal.innerText = "✅ Actualizar Empleado";
    btnCancelar.style.display = "block";
    window.scrollTo({top: 0, behavior: 'smooth'});
}

let idParaEliminar = null; // Variable global para guardar el ID temporalmente

// Reemplaza la función eliminar vieja por esta:
function eliminar(id) {
    idParaEliminar = id;
    const dModal = document.getElementById('deleteModal');
    dModal.style.display = "flex";
    
    // Forzamos un pequeño "despertar" de la UI
    window.dispatchEvent(new Event('resize'));
}



document.getElementById('btnCancelDelete').onclick = cerrarModalBorrado;

function cerrarModalBorrado() {
    document.getElementById('deleteModal').style.display = "none";
    idParaEliminar = null;
    
    // CRÍTICO: Devolver el foco a un input para reactivar el teclado
    setTimeout(() => {
        inputId.focus();
        window.dispatchEvent(new Event('resize')); // Latido manual
    }, 100);
}

function limpiar() {
    editando = false;
    inputId.value = ""; inputId.disabled = false;
    inputNombre.value = "";
    document.getElementById('fotoBase').value = "";
    fotoBlob = null; preview.style.display = "none";
    btnPrincipal.innerText = "➕ Agregar Empleado";
    btnCancelar.style.display = "none";
}

function mostrarMensaje(txt, tipo) {
    const box = document.getElementById('msg');
    box.innerText = txt; box.className = tipo; box.style.display = "block";
    setTimeout(() => { box.style.display = "none"; if(!editando) inputId.focus(); }, 3000);
}

// Latido anti-bloqueo
setInterval(() => { if(!editando && document.activeElement.tagName !== "INPUT") window.dispatchEvent(new Event('resize')); }, 2000);