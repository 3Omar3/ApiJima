const { getConnection } = require("../database"); // mysql-promise
const modelo = require("../utility/modelo");

async function getPruchaseYears() {
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

async function getPurchasePredios(anio, idCliente) {
  const sql = `SELECT id_venta, id_predio, nombre, DATE_FORMAT(fecha_plantar, '%Y-%m-%d') as fecha_plantar, predios.Cantidad AS total_planta, ventas.cantidad AS cantidadPredio, (SELECT cantidad FROM detalle_saldos INNER JOIN saldos ON fk_saldo=ID_Saldo AND FK_Cliente=${idCliente} WHERE FK_Predio=ID_Predio) AS cantidadSaldos, precio AS precio, tipo, solares, hectareas, dimensiones, ubicacion, coordenadas, direccion_completa, (SELECT SUM(ventas.cantidad)-IFNULL((SELECT SUM(compras.cantidad) FROM compras WHERE FK_Venta=id_venta), 0) FROM ventas WHERE fk_vendedor=${idCliente} AND tipo_venta='Cliente' AND fk_predio=id_predio AND estatus=0) AS cantidad_venta, (SELECT SUM(cantidad) FROM compras WHERE fk_venta = id_venta) AS cantidad_compras FROM predios INNER JOIN ventas ON ventas.FK_Predio = id_predio LEFT JOIN detalle_saldos ON detalle_saldos.fk_predio = id_predio LEFT JOIN saldos ON fk_saldo=id_saldo WHERE tipo_venta = 'Administrador' AND DATE_FORMAT(fecha_plantar, '%Y') =${anio} GROUP BY id_predio`;

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

module.exports = {
  getPruchaseYears,
  getPurchasePredios,
};
