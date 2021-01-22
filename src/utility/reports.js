const { getConnection } = require("../database"); // mysql-promise
const modelo = require("./modelo");

// tabla mis compras
async function getCompras() {
  try {
    const sql =
      "SELECT ID_Compra, compras.Fecha_Registro AS toDate, DATE_FORMAT(compras.Fecha_Registro, '%d-%m-%Y %r') AS Fecha, DATE_FORMAT(compras.Fecha_Registro, '%Y-%m-%d') AS Fecha_Registro, Nombre AS Predio, Fecha_Plantar, compras.Cantidad AS Cantidad, $tipoPrecioC AS Precio, compras.Tipo AS Tipo, kilos, total AS total, FK_Sugerido, Calificacion FROM compras INNER JOIN ventas ON FK_Venta=ID_Venta INNER JOIN predios ON FK_Predio=ID_Predio $comprador";
    return arr;
  } catch (e) {
    throw new Error(e);
  }
}

// tabla transacciones, tipo = 1: generales, tipo = 2 mis transacciones,
async function getTransacciones(tipo = 2, idCliente) {
  const today = new Date().toISOString().slice(0, 10); // today, now
  let vendedor = "",
    comprador = "",
    arr = [];

  if (tipo === 1) {
    vendedor = `AND fk_vendedor=${idCliente}`;
    comprador = `WHERE fk_comprador=${idCliente}`;
  }

  const sql = `select id_compra, compras.fecha_registro AS toDate, DATE_FORMAT(compras.fecha_registro, '%d-%m-%Y %r') AS fecha, DATE_FORMAT(compras.fecha_registro, '%Y-%m-%d') AS fecha_registro, nombre AS predio, DATE_FORMAT(fecha_plantar, '%Y-%m-%d') as fecha_plantar, compras.cantidad AS cantidad, compras.precio AS precio, compras.tipo AS tipo, kilos, total AS total, fk_sugerido, calificacion FROM compras INNER JOIN ventas ON FK_Venta=ID_Venta INNER JOIN predios ON fk_predio=id_predio ${comprador} ORDER BY fecha_registro DESC`;
  const sql2 = `select fecha_registro AS toDate, id_venta, DATE_FORMAT(fecha_registro, '%d-%m-%Y %r') AS fecha, nombre AS predio, DATE_FORMAT(fecha_plantar, '%Y-%m-%d') as fecha_plantar, ventas.cantidad AS cantidad, precio AS precio, tipo, tipo_venta, estatus FROM ventas INNER JOIN predios ON fk_predio=ID_Predio WHERE precio != 0 ${vendedor} ORDER BY fecha_registro DESC`;

  try {
    const conn = await getConnection();
    const r = await conn.query(sql);
    const r2 = await conn.query(sql2);

    if (r.length) {
      for (let i = 0; i < r.length; ++i) {
        let kilos = "",
          estrellas = 0;
        if (r[i].kilos) kilos = r[i].kilos;

        if (r[i].fk_sugerido != "0")
          if (r[i].calificacion != "0") estrellas = r[i].calificacion;

        arr.push({
          id: r[i].id_compra,
          fecha: r[i].fecha,
          tipo: "compra",
          estatus: "completada",
          predio: r[i].predio,
          edad: modelo.getAge(r[i].fecha_registro, r[i].fecha_plantar)[0],
          cantidad: r[i].cantidad + " plantas" + (kilos ? " " + kilos : ""),
          precio: r[i].precio,
          total: r[i].total,
          contrato: r[i].id_compra,
          calificacion: estrellas,
        });
      }
    }

    if (r2.length) {
      for (let i = 0; i < r2.length; ++i) {
        let suma = 0;

        if (r2[i].estatus) continue;

        // tabuladores
        let total = 0;
        kilos = "";
        let date = new Date(r2[i].fecha_plantar);
        let newDate = new Date(
          date.getFullYear() + 2,
          date.getMonth() + 1,
          date.getDate()
        );

        if (today >= newDate && r2[i].tipo_venta == "Kilos") {
          let tabulador = modelo.getTabuladores(
            r2[i].fk_predio,
            r2[i].fecha_plantar,
            0
          );
          kilos = tabulador.kilos;

          total = r2[i].cantidad * tabulador.kilos * r2[i].precio;
        } else total = (r2[i].cantidad - suma) * r2[i].precio;

        arr.push({
          id_venta: r2[i].id_venta,
          fecha: r2[i].fecha,
          tipo: "venta",
          estatus: "en venta",
          predio: r2[i].predio,
          edad: modelo.getAge(today, r2[i].fecha_plantar)[0],
          cantidad: r2[i].cantidad - suma + " plantas",
          precio: r2[i].precio,
          total,
        });
      }
    }

    return arr;
  } catch (e) {
    throw new Error(e);
  }
}

module.exports = {
  getCompras,
  getTransacciones,
};
