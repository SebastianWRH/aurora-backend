// index.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const connection = require('./db'); // tu conexión a MySQL

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REGISTRO
app.post('/registro', async (req, res) => {
  const rol = 'cliente';
  const {
    nombre, correo, contrasena, confirmar,
    celular, departamento, provincia, distrito,
    direccion, tipo_documento, numero_documento
  } = req.body;

  if (contrasena !== confirmar) {
    return res.status(400).json({ mensaje: 'Las contraseñas no coinciden' });
  }

  try {
    // Verificar si el correo ya existe

    const hashed = await bcrypt.hash(contrasena, 10);

    const query = `
      INSERT INTO usuarios
      (nombre, correo, contrasena, celular, departamento, provincia, distrito, direccion, tipo_documento, numero_documento, rol)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.promise().query(query, [
      nombre, correo, hashed, celular, departamento,
      provincia, distrito, direccion, tipo_documento, numero_documento, rol
    ]);

    res.status(200).json({ mensaje: 'Usuario registrado con éxito' });
  } catch (err) {
  console.error('❌ Error al registrar:', err);

  const mensajeError = err?.sqlMessage || err?.message || '';

  if (err.code === 'ER_DUP_ENTRY' || mensajeError.includes('Duplicate entry')) {
    console.log('🛑 Correo duplicado detectado');
    return res.status(409).json({ mensaje: 'Este correo ya está registrado' });
  }

  return res.status(500).json({ mensaje: 'Error interno del servidor' });
}


});



// LOGIN
app.post('/login', (req, res) => {
  const { correo, contrasena } = req.body;

  const query = 'SELECT * FROM usuarios WHERE correo = ?';
  connection.query(query, [correo], async (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error del servidor' });

    if (results.length === 0) {
      return res.status(401).json({ mensaje: 'Correo no encontrado' });
    }

    const usuario = results[0];
    const match = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!match) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    const { contrasena: _, ...usuarioSinContra } = usuario;
    res.status(200).json({
      mensaje: 'Login exitoso',
      usuario: usuarioSinContra
    });
  });
});

// OBTENER PERFIL
app.get('/usuario/:id', (req, res) => {
  const id = req.params.id;
  const query = 'SELECT * FROM usuarios WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error al obtener perfil' });
    if (results.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const { contrasena: _, ...usuario } = results[0];
    res.status(200).json(usuario);
  });
});

// ACTUALIZAR PERFIL
app.put('/usuario/:id', (req, res) => {
  const id = req.params.id;
  const {
    nombre, correo, celular, departamento, provincia,
    distrito, direccion, tipo_documento, numero_documento
  } = req.body;

  const query = `
    UPDATE usuarios SET
      nombre = ?, correo = ?, celular = ?, departamento = ?,
      provincia = ?, distrito = ?, direccion = ?, tipo_documento = ?, numero_documento = ?
    WHERE id = ?
  `;

  connection.query(query, [
    nombre, correo, celular, departamento, provincia,
    distrito, direccion, tipo_documento, numero_documento, id
  ], (err) => {
    if (err) {
      console.error('Error al actualizar:', err);
      return res.status(500).json({ mensaje: 'Error al actualizar perfil' });
    }
    res.status(200).json({ mensaje: 'Perfil actualizado con éxito' });
  });
});

// Obtener productos
app.get('/productos', (req, res) => {
  connection.query('SELECT * FROM productos', (err, resultados) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ mensaje: 'Error al obtener productos' });
    }

    const productos = resultados.map(p => {
      try {
        p.imagenes = JSON.parse(p.imagenes);
      } catch {
        p.imagenes = [];
      }
      return p;
    });

    res.json({ productos });
  });
});



// Obtener producto por id
app.get('/producto/:id', async (req, res) => {
  const { id } = req.params;
  connection.query('SELECT * FROM productos WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    if (results.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const producto = results[0];
    try {
      producto.imagenes = JSON.parse(producto.imagenes);
    } catch {
      producto.imagenes = [];
    }

    res.json(producto);
  });
});

// Agregar a favoritos
app.post('/favoritos', (req, res) => {
  const { id_usuario, id_producto } = req.body;

  const query = 'INSERT INTO favoritos (id_usuario, id_producto) VALUES (?, ?)';
  connection.query(query, [id_usuario, id_producto], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ mensaje: 'Ya está en favoritos' });
      }
      return res.status(500).json({ mensaje: 'Error al agregar a favoritos' });
    }
    res.json({ mensaje: 'Agregado a favoritos' });
  });
});

// Obtener favoritos
app.get('/favoritos/:id_usuario', (req, res) => {
  const idUsuario = req.params.id_usuario;

  const query = `
    SELECT productos.*
    FROM favoritos
    JOIN productos ON favoritos.id_producto = productos.id
    WHERE favoritos.id_usuario = ?
  `;

  connection.query(query, [idUsuario], (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error al obtener favoritos' });
    res.json(results);
  });
});

// Verificar si es favorito
app.get('/favoritos/esta/:id_usuario/:id_producto', (req, res) => {
  const { id_usuario, id_producto } = req.params;
  const q = 'SELECT 1 FROM favoritos WHERE id_usuario = ? AND id_producto = ? LIMIT 1';
  connection.query(q, [id_usuario, id_producto], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error' });
    res.json({ esFavorito: rows.length > 0 });
  });
});

// Eliminar de favoritos
app.delete('/favoritos', (req, res) => {
  const { id_usuario, id_producto } = req.body;

  const query = 'DELETE FROM favoritos WHERE id_usuario = ? AND id_producto = ?';
  connection.query(query, [id_usuario, id_producto], (err, result) => {
    if (err) {
      console.error('Error al quitar de favoritos:', err);
      return res.status(500).json({ mensaje: 'Error al quitar de favoritos' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'No se encontró el favorito para eliminar' });
    }

    res.json({ mensaje: 'Eliminado de favoritos' });
  });
});

// Crear un pedido
app.post('/pedidos', (req, res) => {
  const { id_usuario, total, items } = req.body;
  if (!id_usuario || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ mensaje: 'Datos inválidos' });
  }

  connection.beginTransaction(err => {
    if (err) {
      console.error('Begin transaction error:', err);
      return res.status(500).json({ mensaje: 'Error en el servidor' });
    }

    const qPedido = 'INSERT INTO pedidos (id_usuario, total) VALUES (?, ?)';
    connection.query(qPedido, [id_usuario, total], (err, result) => {
      if (err) {
        console.error('Error insert pedido:', err);
        return connection.rollback(() => res.status(500).json({ mensaje: 'Error al crear pedido' }));
      }

      const idPedido = result.insertId;
      const values = items.map(it => [idPedido, it.id_producto, it.cantidad, it.precio_unitario]);

      const qDetalles = 'INSERT INTO pedido_detalles (id_pedido, id_producto, cantidad, precio_unitario) VALUES ?';
      connection.query(qDetalles, [values], (err) => {
        if (err) {
          console.error('Error insert detalles:', err);
          return connection.rollback(() => res.status(500).json({ mensaje: 'Error al guardar detalles' }));
        }

        // Restar stock
        const queriesStock = items.map(it => {
          return new Promise((resolve, reject) => {
            const qStock = 'UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?';
            connection.query(qStock, [it.cantidad, it.id_producto, it.cantidad], (err, result) => {
              if (err) return reject(err);
              if (result.affectedRows === 0) {
                return reject(new Error(`Stock insuficiente para el producto ${it.id_producto}`));
              }
              resolve();
            });
          });
        });

        Promise.all(queriesStock)
          .then(() => {
            connection.commit(commitErr => {
              if (commitErr) {
                console.error('Commit error:', commitErr);
                return connection.rollback(() => res.status(500).json({ mensaje: 'Error en la transacción' }));
              }
              res.status(200).json({ mensaje: 'Pedido creado y stock actualizado', id_pedido: idPedido });
            });
          })
          .catch(stockErr => {
            console.error('Error al actualizar stock:', stockErr);
            connection.rollback(() => res.status(400).json({ mensaje: stockErr.message }));
          });
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});








// === RUTAS DE PEDIDOS CORREGIDAS ===

// Obtener todos los pedidos de un usuario (lista)
app.get('/pedidos/:id_usuario', (req, res) => {
  const idUsuario = req.params.id_usuario;
  const q = `
    SELECT p.id, p.id_usuario, p.total, p.fecha
    FROM pedidos p
    WHERE p.id_usuario = ?
    ORDER BY p.id DESC
  `;
  connection.query(q, [idUsuario], (err, results) => {
    if (err) {
      console.error('Error al obtener pedidos:', err.message);
      return res.status(500).json({ mensaje: 'Error al obtener pedidos' });
    }
    res.json(results);
  });
});

// Obtener detalles de un pedido (productos dentro del pedido)
app.get('/pedido/:id', (req, res) => {
  const idPedido = req.params.id;
  const qPedido = 'SELECT id, id_usuario, total, fecha, estado FROM pedidos WHERE id = ? LIMIT 1';
  connection.query(qPedido, [idPedido], (err, pedidos) => {
    if (err) {
      console.error('Error al obtener pedido:', err.message);
      return res.status(500).json({ mensaje: 'Error al obtener pedido' });
    }
    if (pedidos.length === 0) return res.status(404).json({ mensaje: 'Pedido no encontrado' });

    const pedido = pedidos[0];

    const qDetalles = `
      SELECT pd.id as detalle_id, pd.id_producto, pd.cantidad, pd.precio_unitario,
             pr.nombre, pr.imagenes, pr.stock
      FROM pedido_detalles pd
      JOIN productos pr ON pd.id_producto = pr.id
      WHERE pd.id_pedido = ?
    `;
    connection.query(qDetalles, [idPedido], (err, detallesRows) => {
      if (err) {
        console.error('Error al obtener detalles del pedido:', err.message);
        return res.status(500).json({ mensaje: 'Error al obtener detalles' });
      }

      // parsear imágenes si vienen como JSON
      const detalles = detallesRows.map(d => {
        let imgs = [];
        try {
          imgs = JSON.parse(d.imagenes);
        } catch (e) {
          imgs = [];
        }
        return { ...d, imagenes: imgs };
      });

      res.json({ pedido, detalles });
    });
  });
});

// (Opcional) Obtener todos los pedidos (por ejemplo para admin)
app.get('/pedidos', (req, res) => {
  const q = `
    SELECT p.id, p.id_usuario, p.total, p.fecha, p.estado, u.nombre as cliente
    FROM pedidos p
    LEFT JOIN usuarios u ON p.id_usuario = u.id
    ORDER BY p.id DESC
  `;
  connection.query(q, (err, results) => {
    if (err) {
      console.error('Error al obtener todos los pedidos:', err.message);
      return res.status(500).json({ mensaje: 'Error al obtener pedidos' });
    }
    res.json(results);
  });
});




// --- Ruta para consultar stock de un producto (Paso 1) ---
app.get('/stock/:id_producto', (req, res) => {
  const id = req.params.id_producto;
  const q = 'SELECT id, stock FROM productos WHERE id = ? LIMIT 1';
  connection.query(q, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener stock:', err.message);
      return res.status(500).json({ mensaje: 'Error al obtener stock' });
    }
    if (!results || results.length === 0) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    res.json(results[0]); // { id: X, stock: Y }
  });
});


app.get('/usuarios', (req, res) => {
  connection.query('SELECT id AS id, nombre, correo, rol FROM usuarios', (err, results) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({ mensaje: 'Error al obtener usuarios' });
    }
    res.json({ usuarios: results });
  });
});


// AGREGAR NUEVO PRODUCTO
app.post('/productos', async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, stock, miniatura, imagenes } = req.body;

    const valores = [nombre, descripcion, precio, categoria, stock, miniatura, JSON.stringify(imagenes)];

    const query = `
      INSERT INTO productos (nombre, descripcion, precio, categoria, stock, miniatura, imagenes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(query, valores, (error, results) => {
      if (error) {
        // 🔥 Manda el mensaje de error al cliente
        return res.status(500).json({
          mensaje: 'Error al agregar producto',
          detalle: error.message, // 👈 Aquí aparece el error real
        });
      }

      res.status(201).json({ mensaje: 'Producto agregado correctamente' });
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error inesperado', detalle: error.message });
  }
});









app.put('/productos/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, categoria, stock, miniatura, imagenes } = req.body;
  const imagenesJSON = JSON.stringify(imagenes || []);

  const query = `UPDATE productos SET nombre=?, descripcion=?, precio=?, categoria=?, stock=?, miniatura=?, imagenes=?
                 WHERE id=?`;

  connection.query(query, [nombre, descripcion, precio, categoria, stock, miniatura, imagenesJSON, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar producto:', err);
      return res.status(500).json({ mensaje: 'Error al actualizar producto' });
    }
    res.json({ mensaje: 'Producto actualizado correctamente' });
  });
});








app.delete('/productos/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM productos WHERE id = ?';
  connection.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar producto:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar producto' });
    }
    res.json({ mensaje: 'Producto eliminado correctamente' });
  });
});



// OBTENER UN PRODUCTO POR ID
app.get('/productos', (req, res) => {
  connection.query('SELECT id, nombre, descripcion, precio, categoria, stock, miniatura FROM productos', (err, results) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ mensaje: 'Error al obtener productos' });
    }

    res.json({ productos: results });
  });
});

