# Ateneo en vivo

Presentación interactiva para un ateneo de residentes de Clínica Médica. El público entra con el navegador del celular, sin cuenta ni aplicación. Elige su servicio (UTI, Clínica o UCO), sigue la diapositiva que marca el presentador y vota. Los resultados se proyectan recién cuando el presentador los habilita.

React en el frente. Node, Socket.io y MongoDB en el servidor. Un solo origen HTTPS sirve la página, la API y el tiempo real, así el código QR apunta a la misma dirección que usan los celulares.

## Cómo se usa

| Quién | Dirección | Qué hace |
| --- | --- | --- |
| Público | `/` | Ve la diapositiva actual y vota. Sin clave. |
| Dueño de la sala | «Acceder como dueño de la sala», al pie de esa misma página | Una clave abre la proyección y la edición. |

Cada celular guarda un identificador anónimo en `localStorage`. Si recarga, conserva ese identificador, el servicio y los votos. Puede cambiar un voto mientras esa pregunta esté abierta.

## Desarrollo local

Hace falta Node 20 o más nuevo. No hace falta tener MongoDB instalado.

```bash
npm install
copy .env.example .env
```

En `.env`:

```
PRESENTER_KEY=ateneo
ALLOW_MEMORY_MONGO=1
PORT=3001
```

`ALLOW_MEMORY_MONGO=1` levanta una base en memoria. Los votos se pierden al cerrar el servidor. No lo uses en producción.

```bash
npm run dev
```

- Sala: http://localhost:5173/
- Dueño: el enlace al pie, o http://localhost:5173/sala
- La API queda en el puerto 3001. Vite le reenvía `/api` y `/socket.io`.

La clave del presentador es el valor de `PRESENTER_KEY`. En el archivo de desarrollo de esta carpeta está `ateneo`. Cambiala antes de proyectar en un lugar con red abierta.

### Para que el QR funcione en los celulares

`localhost` solo abre en la computadora del dueño. El QR avisa y muestra la dirección de la red local, por ejemplo `http://192.168.1.80:5173/sala`. Entrá por esa dirección, en la misma Wi-Fi, y el código que se proyecta va a abrir en los teléfonos.

## Producción

Variables:

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `MONGODB_URI` | Sí | MongoDB Atlas o un Mongo propio. Ejemplo en `.env.example`. |
| `PRESENTER_KEY` | Sí | Mínimo 4 caracteres. Es la clave del dueño de la sala y firma el token. |
| `PUBLIC_URL` | Sí, para el QR | URL pública HTTPS, sin barra final. Es la dirección que se codifica en el QR. |
| `NODE_ENV` | Sí | `production` |
| `PORT` | La define el hosting | El proceso escucha ese puerto. |

No definas `ALLOW_MEMORY_MONGO` en producción: el proceso no arranca sin `MONGODB_URI`.

```bash
npm install
npm run build
npm start
```

`npm run build` genera `client/dist`. `npm start` sirve esa carpeta, la API y Socket.io en el mismo puerto.

### Render o Railway

Un solo servicio web de Node, con HTTPS:

- Comando de build: `npm install && npm run build`
- Comando de start: `npm start`
- Node 20 o más nuevo
- Las cinco variables de arriba
- `PUBLIC_URL` tiene que ser exactamente la URL HTTPS del servicio

En Atlas, permití la IP del hosting (o `0.0.0.0/0` si el proveedor no tiene IP fija) y un usuario con permiso de lectura y escritura sobre la base `paglu`.

## Qué puede escribir cada uno

- El público solo escribe su propio voto, con el secreto que quedó en su celular. El servidor guarda el hash, no el secreto.
- Pasar de diapositiva, mostrar resultados, editar el contenido, restaurar el original, reiniciar votos y bajar el CSV exigen la clave del presentador.
- Una clave incorrecta responde 401. A los 8 intentos fallidos en 10 minutos, esa IP queda frenada un rato.
- El texto de las nubes de palabras se limpia: se sacan etiquetas, se recorta y cada persona manda hasta 5 palabras.

El celular del público recibe únicamente la diapositiva en curso. El mazo completo llega al presentador después de la clave.

## Editor y CSV

Desde la proyección, «Editar» abre el contenido en la misma sesión. Ahí se publican los cambios a todas las pantallas. Las diapositivas de servicio, hipótesis inicial, estudios y costo no se pueden borrar. El botón de restaurar vuelve a las 17 diapositivas originales y a la tabla de precios, y deja la sala en la portada. No borra los votos.

El CSV (botón del editor, o `GET /api/export.csv` con `Authorization: Bearer …`) trae una fila por voto: participante, servicio, diapositiva, pregunta, respuesta y costo. Separador `;`, UTF-8 con BOM.

## Pruebas

```bash
npm test
```

Cubre el mazo precargado, la validación del editor, la agregación por servicio y el cálculo de costos. No necesita MongoDB.
