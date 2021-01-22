const { getConnection } = require("../database"); // mysql-promise
const modelo = require("../utility/modelo");

async function getSaleYears() {
  const sql =
    "SELECT DATE_FORMAT(fecha_plantar, '%Y') AS anios FROM ventas INNER JOIN predios ON fk_predio=id_predio GROUP BY DATE_FORMAT(fecha_plantar, '%Y')";

  try {
    const conn = await getConnection();
    const res = await conn.query(sql);

    let arr = [];
    for (let e of res) arr.push(e.anios);
    return arr;
  } catch (e) {
    throw new Error(e);
  }
}

async function checkSalePredios(idCliente) {
  const sql = `SELECT id_predio FROM detalle_saldos INNER JOIN saldos ON fk_saldo=id_saldo INNER JOIN predios ON fk_predio=id_predio LEFT JOIN ventas ON detalle_saldos.FK_Predio=ventas.FK_Predio AND ventas.Tipo_Venta!='Administrador' WHERE saldos.fk_cliente=${idCliente} GROUP BY id_predio`;

  try {
    const conn = await getConnection();
    const res = await conn.query(sql);

    return res.length ? true : false;
  } catch (e) {
    throw new Error(e);
  }
}

async function getSalePredios(anio, idCliente) {
  const sql = `SELECT id_venta, id_predio, nombre, DATE_FORMAT(fecha_plantar, '%Y-%m-%d') as fecha_plantar, predios.cantidad AS total_planta, (SELECT cantidad FROM ventas WHERE fk_predio=id_predio AND tipo_venta='Administrador') AS cantidadPredio, detalle_saldos.cantidad AS cantidadSaldos, precio, tipo, solares, hectareas, dimensiones, ubicacion, coordenadas, direccion_completa, fk_cliente, (SELECT SUM(ventas.cantidad)-IFNULL((SELECT SUM(compras.cantidad) FROM compras WHERE fk_venta=id_venta), 0) FROM ventas WHERE fk_vendedor=${idCliente} AND Tipo_Venta='Cliente' AND FK_Predio=ID_Predio AND Estatus=0) AS Cantidad_Venta, (SELECT SUM(Cantidad) FROM compras WHERE FK_Venta = (SELECT ID_Venta FROM ventas WHERE fk_predio=id_predio AND tipo_venta='Administrador')) AS cantidad_compras FROM detalle_saldos INNER JOIN saldos ON fk_saldo=id_saldo INNER JOIN predios ON fk_predio=id_predio LEFT JOIN ventas ON detalle_saldos.FK_Predio=ventas.FK_Predio AND ventas.Tipo_Venta!='Administrador' WHERE saldos.fk_cliente=${idCliente} AND DATE_FORMAT(fecha_plantar, '%Y') = ${anio} GROUP BY id_predio`;

  try {
    const conn = await getConnection();
    const res = await conn.query(sql);
    const date = new Date().toISOString().slice(0, 10); // today, now Y/M/D

    for (let e of res) {
      disponible = e.cantidadPredio - e.cantidad_compras;
      e["plantasDisponibles"] = disponible;

      const edad = modelo.getAge(date, e.fecha_plantar);
      const ubicacion = e.ubicacion.split(",");
      e["edad"] = edad[0];
      e["ubicacion"] = {
        latitude: Number(ubicacion[0]),
        longitude: Number(ubicacion[1]),
      };

      let finalCoordenadas = [];
      const splitCoordenadas = e.coordenadas.split("~"); // formato [ latitud, longitud ]

      for (let coordenada of splitCoordenadas) {
        const c = coordenada.split(",");
        finalCoordenadas.push({
          latitude: Number(c[0]),
          longitude: Number(c[1]),
        });
      }

      e["coordenadas"] = finalCoordenadas;
    }

    return res;
  } catch (e) {
    throw new Error(e);
  }
}

module.exports = { getSaleYears, getSalePredios, checkSalePredios };
