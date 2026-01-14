const API_KEY = '0cbf93496fca846b4746c40bb536c320';
const URL_NOW_PLAYING = `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=es-ES&page=1`;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const contenedorCartelera = document.getElementById('cartelera');
    const grillaAsientos = document.getElementById('grilla-asientos');

    if (contenedorCartelera) {
        cargarPeliculas();
    }

    if (grillaAsientos) {
        renderizarSala();
        cargarPeliculasReserva();
    }

    // Modal de la cartelera (index)
    const botonCerrar = document.getElementById('cerrar-modal');
    if (botonCerrar) {
        botonCerrar.onclick = () => {
            document.getElementById('modal-pelicula').style.display = "none";
        };
    }

    // Eventos para actualizar sala según selección en Reservas
    const comboPelis = document.getElementById('combo-peliculas');
    const inputFecha = document.getElementById('fecha-reserva');

    if (comboPelis) comboPelis.addEventListener('change', renderizarSala);
    if (inputFecha) inputFecha.addEventListener('change', renderizarSala);
});

// --- FUNCIONES CARTELERA (INDEX) ---
async function cargarPeliculas() {
    try {
        const response = await fetch(URL_NOW_PLAYING);
        const data = await response.json();
        const contenedor = document.getElementById('cartelera');
        let htmlContenido = '';

        data.results.forEach(pelicula => {
            htmlContenido += `
                <div class="pelicula-card" onclick="verDetalle(${pelicula.id})" style="cursor: pointer;">
                    <img src="https://image.tmdb.org/t/p/w500${pelicula.poster_path}" alt="${pelicula.title}">
                    <h3>${pelicula.title}</h3>
                </div>
            `;
        });
        contenedor.innerHTML = htmlContenido;
    } catch (err) {
        console.error("Error al cargar cartelera:", err);
    }
}

async function verDetalle(id) {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=es-ES`);
        const peli = await res.json();
        const contenedor = document.getElementById('detalles-pelicula');
        const modal = document.getElementById('modal-pelicula');
        const paises = peli.production_countries ? peli.production_countries.map(c => c.name).join(', ') : 'No disponible';

        contenedor.innerHTML = `
            <h2>${peli.title}</h2>
            <p><strong>Origen:</strong> ${paises}</p>
            <p><strong>Descripción:</strong> ${peli.overview}</p>
            <p><strong>Puntuación:</strong> ${peli.vote_average}</p>
        `;
        modal.style.display = "block";
    } catch (err) {
        console.error("Error al obtener detalles:", err);
    }
}

// --- FUNCIONES SALA Y RESERVAS ---
async function cargarPeliculasReserva() {
    try {
        const res = await fetch(URL_NOW_PLAYING);
        const data = await res.json();
        const select = document.getElementById('combo-peliculas');
        if (!select) return;

        data.results.forEach(peli => {
            const opt = document.createElement('option');
            opt.value = peli.id;
            opt.textContent = peli.title;
            select.appendChild(opt);
        });

        select.onchange = (e) => {
            actualizarInfoPelicula(e.target.value);
            renderizarSala();
        };
    } catch (err) {
        console.error("Error al cargar combo:", err);
    }
}

async function actualizarInfoPelicula(id) {
    const contenedorInfo = document.getElementById('info-pelicula-reserva');
    if (!id) {
        contenedorInfo.innerHTML = '';
        return;
    }
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=es-ES`);
        const peli = await res.json();
        contenedorInfo.innerHTML = `
            <h3>${peli.title}</h3>
            <p>${peli.overview}</p>
        `;
    } catch (err) {
        console.error("Error al cargar info:", err);
    }
}

function renderizarSala() {
    const contenedor = document.getElementById('grilla-asientos');
    if (!contenedor) return;

    const peliId = document.getElementById('combo-peliculas').value;
    const fecha = document.getElementById('fecha-reserva').value;
    
    contenedor.innerHTML = '';

    // LEER "BBDD" LOCAL
    const reservas = JSON.parse(localStorage.getItem('reservas_cine')) || [];
    const reservaExistente = reservas.find(r => r.idPeli === peliId && r.fecha === fecha);
    const ocupados = reservaExistente ? reservaExistente.asientos : [];

    let contadorAsiento = 0;
    for (let f = 3; f <= 20; f++) {
        const filaConfig = [
            { cant: 1, clase: 'pasillo' },
            { cant: 3, clase: 'asiento' },
            { cant: 1, clase: 'pasillo' },
            { cant: 10, clase: 'asiento' },
            { cant: 1, clase: 'pasillo' },
            { cant: 3, clase: 'asiento' },
            { cant: 1, clase: 'pasillo' }
        ];

        filaConfig.forEach(bloque => {
            for (let i = 0; i < bloque.cant; i++) {
                const div = document.createElement('div');
                div.className = bloque.clase;
                
                if (bloque.clase === 'asiento') {
                    const idAsiento = contadorAsiento.toString();
                    div.dataset.index = idAsiento;

                    if (ocupados.includes(idAsiento)) {
                        div.classList.add('ocupado');
                    } else {
                        div.onclick = () => {
                            div.classList.toggle('seleccionado');
                            actualizarResumen();
                        };
                    }
                    contadorAsiento++;
                }
                contenedor.appendChild(div);
            }
        });
    }
}

function actualizarResumen() {
    const seleccionados = document.querySelectorAll('.asiento.seleccionado').length;
    const precioUnitario = 500;
    
    document.getElementById('contador-asientos').textContent = seleccionados;
    document.getElementById('total-precio').textContent = seleccionados * precioUnitario;
}

// --- LÓGICA DE COMPRA Y PERSISTENCIA ---
const btnComprar = document.getElementById('btn-comprar');
if (btnComprar) {
    btnComprar.onclick = () => {
        const select = document.getElementById('combo-peliculas');
        const peliculaTexto = select.options[select.selectedIndex].text;
        const fecha = document.getElementById('fecha-reserva').value;
        const seleccionados = document.querySelectorAll('.asiento.seleccionado');
        const precioTotal = document.getElementById('total-precio').textContent;

        if (!select.value || !fecha || seleccionados.length === 0) {
            alert("Faltan datos: Película, Fecha o Asientos.");
            return;
        }

        // GUARDAR EN LOCALSTORAGE
        guardarReserva(select.value, fecha, seleccionados, precioTotal);

        // MOSTRAR MODAL
        const modal = document.getElementById('modal-reserva');
        const detalle = document.getElementById('detalle-final');

        detalle.innerHTML = `
            <p><strong>Película:</strong> ${peliculaTexto}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Asientos:</strong> ${seleccionados.length}</p>
            <p><strong>Total:</strong> $${precioTotal}</p>
        `;
        modal.style.display = "block";
    };
}

function guardarReserva(peliId, fecha, nodosAsientos, total) {
    const indicesNuevos = Array.from(nodosAsientos).map(as => as.dataset.index);
    let reservas = JSON.parse(localStorage.getItem('reservas_cine')) || [];

    const indice = reservas.findIndex(r => r.idPeli === peliId && r.fecha === fecha);

    if (indice !== -1) {
        reservas[indice].asientos.push(...indicesNuevos);
    } else {
        reservas.push({
            idPeli: peliId,
            fecha: fecha,
            asientos: indicesNuevos,
            gasto: total
        });
    }
    localStorage.setItem('reservas_cine', JSON.stringify(reservas));
}

// --- CIERRE Y LIMPIEZA ---
const cerrarConfirmacion = () => {
    document.getElementById('modal-reserva').style.display = "none";
    // Limpiar UI
    document.getElementById('fecha-reserva').value = "";
    document.getElementById('combo-peliculas').value = "";
    document.getElementById('info-pelicula-reserva').innerHTML = "";
    actualizarResumen();
    renderizarSala(); // Redibuja para que los recién comprados salgan rojos
};

const btnAceptarFinal = document.getElementById('btn-aceptar-final');
const btnCerrarModalReserva = document.getElementById('cerrar-modal-reserva');

if (btnAceptarFinal) btnAceptarFinal.onclick = cerrarConfirmacion;
if (btnCerrarModalReserva) btnCerrarModalReserva.onclick = cerrarConfirmacion;