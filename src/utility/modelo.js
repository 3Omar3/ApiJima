const { getConnection } = require("../database"); // mysql-promise

// get precios
async function getPrecios() {
  try {
    const sql =
      "(SELECT monto AS precio FROM precios WHERE Tipo = 0 ORDER BY fecha_precio LIMIT 1) UNION (SELECT monto FROM precios WHERE Tipo= 1 ORDER BY fecha_precio LIMIT 1)";
    const conn = await getConnection();
    const result = await conn.query(sql);

    if (!result.length) return 0;

    let arr = [];
    result.forEach((e) => {
      arr.push(e.precio);
    });
    return arr;
  } catch (e) {
    throw e;
  }
}

function daysInMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getAge(actual, fecha) {
  let print = []; // formato a imprimir

  // separamos en partes las fechas
  const arr_nacimiento = fecha.split("-");
  const arr_actual = actual.split("-");

  let anios = arr_actual[0] - arr_nacimiento[0]; // calculamos años
  let meses = arr_actual[1] - arr_nacimiento[1]; // calculamos meses
  let dias = arr_actual[2] - arr_nacimiento[2]; // calculamos días

  // funcion auxiliar para años bisiestos
  function bisiesto(anio, mes, diaPrueba) {
    return mes == 2 &&
      diaPrueba == 29 &&
      (anio % 400 == 0 || (anio % 4 == 0 && anio % 100 != 0))
      ? true
      : false;
  }

  // dias negativos
  if (dias < 0) {
    --meses;
    const diasPorMes = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    dias += bisiesto(arr_actual[0], arr_actual[1], arr_actual[2])
      ? 29
      : diasPorMes[Number(arr_actual[1])];
  }

  // meses negativos
  if (meses < 0) {
    --anios;
    meses += 12;
  }

  if (anios < 0) {
    print[0] = "En preventa";
    print[1] = "0~0~0";
    return print;
  }

  let c1 = "",
    c2 = "",
    c3 = "";
  if (anios > 1) c1 = "s";
  if (meses > 1) c2 = "es";
  if (dias > 1) c3 = "s";

  print[1] = `${anios}~${meses}~${dias}`;

  if (anios)
    print[0] = `${anios} año${c1} con ${meses} mes${c2} y ${dias} día${c3}`;
  else if (meses && dias) print[0] = `${meses} mes${c2} y ${dias} día${c3}`;
  else if (meses) print[0] = `${meses} mes${c2}`;
  else if (dias) print[0] = `${dias} dia${c3}`;

  return print;
}

// get tabuladores
async function getTabuladores(predio, fechaPlantar, cantidad) {
  const sql = `SELECT * FROM tabuladores WHERE FK_Predio=${predio} ORDER BY YEAR`;

  try {
    const conn = await getConnection();
    const result = await conn.query(sql);
    const precios = await getPrecios();

    if (!result.length && !precios) return { precio: 0, kilos: 0, total: 0 };

    let precio = 0,
      total = 0,
      kilos = 0;
    let mesActual = 0,
      mesPrevio = 0;
    let kilosActual = 0,
      kilosPrevio = 0;

    const date = new Date().toISOString().slice(0, 10); // today, now
    const edad = getAge(date, fechaPlantar)[1];
    const separa = edad.split("~");
    const yy = Number(separa[0]),
      mm = Number(separa[0]),
      dd = Number(separa[0]);

    if (yy >= 2) {
      if (!mm) kilosPrevio = yy == 2 ? 0 : result[yy - 1]["MES_12"];
      else KilosPrevio = result[yy][`MES_${mm}`];
      KilosActual = result[yy][`MES_${mm + 1}`];
      precio = precios.kg;
      kilos = ((KilosActual - KilosPrevio) / daysInMonth()) * dd + KilosPrevio;
      total = cantidad * kilos * precio;
    } else {
      if (!mm) mesPrevio = !yy ? precios.plant : result[yy - 1]["MES_12"];
      else mesPrevio = result[yy][`MES_${mm}`];

      mesActual = result[yy][`MES_${mm + 1}`];
      precio = ((mesActual - mesPrevio) / daysInMonth()) * dd + mesPrevio;
      total = cantidad * precio;
    }
    return { precio, kilos, total };
  } catch (e) {
    throw e;
  }
}

async function getBalance(idCliente) {
  const sql = `SELECT id_saldo, total_dinero, total_planta FROM saldos WHERE FK_Cliente=${idCliente}`;
  const sql2 = `SELECT detalle_saldos.cantidad AS cantidad_saldo, fk_predio, nombre, predios.cantidad AS cantidad_predio, DATE_FORMAT(fecha_plantar, '%Y-%m-%d') as fecha_plantar, solares, dimensiones, ubicacion, detalles FROM detalle_saldos INNER JOIN predios ON fk_predio = id_predio WHERE fk_saldo = ?`;

  try {
    const conn = await getConnection();
    const r = await conn.query(sql);
    const r2 = await conn.query(sql2, [r[0].id_saldo]);

    if (!r2.length) return { detalles: null, totales: 0 };

    const date = new Date().toISOString().slice(0, 10); // today, now
    let sumaTotal = 0,
      sumaKilos = 0,
      arr = [];

    for (let i = 0; i < r2.length; ++i) {
      const tabulador = await getTabuladores(
        r2[i].fk_predio,
        r2[i].fecha_plantar,
        r2[i].cantidad_saldo
      );

      sumaTotal += tabulador.total;
      sumaKilos += tabulador.kilos;

      arr.push({
        detalles: {
          cantidad_saldo: r2[i].cantidad_saldo,
          precio: tabulador.precio,
          kilos: tabulador.kilos,
          total: tabulador.total,
          nombre: r2[i].nombre,
          cantidad_predio: r2[i].cantidad_predio,
          fecha_plantar: r2[i].fecha_plantar,
          edad: getAge(date, r2[i].fecha_plantar)[0],
          solares: r2[i].solares,
          dimensiones: r2[i].dimensiones,
          ubicacion: r2[i].ubicacion,
          detalles: r2[i].detalles,
        },
      });

      arr.push({
        totales: {
          total_dinero: r[i].total_dinero,
          total_planta: r[i].total_planta,
          total_dinero_planta: sumaTotal,
          total_kilos: sumaKilos,
        },
      });
    }

    if (arr.length) {
      if (arr.length == 1)
        return { detalles: arr[0].detalles, totales: arr[0].totales };
      return { detalles: arr[0].detalles, totales: arr[1].totales };
    } else return { detalles: null, totales: arr[0].totales };
  } catch (e) {
    throw new Error("e");
  }
}

async function getVentas(idCliente) {
  let totalVentas = 0,
    ventas = [];

  try {
    const conn = await getConnection();
    const sql = `SELECT fecha_registro, ventas.cantidad AS cantidad_venta, tipo AS precio, fk_predio, nombre, predios.cantidad AS cantidad_predio, DATE_FORMAT(fecha_plantar, '%Y-%m-%d') as fecha_plantar, solares, dimensiones, ubicacion, detalles FROM ventas INNER JOIN predios ON fk_predio = id_predio WHERE estatus='0' AND tipo_venta='cliente' AND fk_vendedor=${idCliente}`;
    const r = await conn.query(sql);

    if (!r.length) return { totalVentas, ventas: 0 };

    for (let i = 0; i < r.length; ++i) {
      let tabulador = getTabuladores(
        r[i].fk_predio,
        r[i].fecha_plantar,
        r[i].cantidad_venta
      );
      totalVentas += tabulador.total;

      ventas.push({
        fecha_registro: r[i].fecha_registro,
        cantidad_venta: r[i].cantidad_venta,
        tipo: r[i].tipo,
        precio_venta: r[i].precio,
        precio: tabulador.precio,
        kilos: tabulador.kilos,
        total: tabulador.total,
        nombre: r[i].nombre,
        cantidad_predio: r[i].cantidad_predio,
        fecha_plantar: r[i].fecha_plantar,
        solares: r[i].solares,
        dimensiones: r[i].dimensiones,
        ubicacion: r[i].ubicacion,
        detalles: r[i].detalles,
      });
    }

    return { totalVentas, ventas };
  } catch (e) {
    throw e;
  }
}

// detalles saldo y totales
async function getDetalleSaldo(idCliente) {
  const date = new Date().toISOString().slice(0, 10); // today, now Y/M/D
  let sumaTotal = 0,
    sumaKilos = 0;
  let arr = [];

  try {
    const resultVentas = await getVentas(idCliente);

    const conn = await getConnection();

    const sql = `SELECT id_saldo, total_dinero, total_planta FROM saldos WHERE fk_cliente=${idCliente}`;
    const r = await conn.query(sql);

    if (!r.length) return { totales: 0 };

    const sql2 = `SELECT detalle_saldos.cantidad AS cantidad_saldo, fk_predio, nombre, predios.cantidad AS cantidad_predio, DATE_FORMAT(fecha_plantar, '%Y-%m-%d') as fecha_plantar, solares, dimensiones, ubicacion, detalles from detalle_saldos INNER JOIN predios ON fk_predio = id_predio WHERE fk_saldo=${r[0].id_saldo}`;
    const r2 = await conn.query(sql2);

    if (r2.length) {
      for (let i = 0; i < r2.length; ++i) {
        let tabulador = await getTabuladores(
          r2[i].fk_predio,
          r2[i].fecha_plantar,
          r2[i].cantidad_saldo
        );

        sumaTotal += tabulador.total;
        sumaKilos += tabulador.kilos;

        arr.push({
          detalles: {
            cantidad_saldo: r2[i].cantidad_saldo,
            precio: tabulador.precio,
            kilos: tabulador.kilos,
            total: tabulador.total,
            nombre: r2[i].nombre,
            cantidad_predio: r2[i].cantidad_predio,
            fecha_plantar: r2[i].fecha_plantar,
            edad: getAge(date, r2[i].fecha_plantar)[0],
            solares: r2[i].solares,
            dimensiones: r2[i].dimensiones,
            ubicacion: r2[i].ubicacion,
            detalles: r2[i].detalles,
          },
        });
      }
    }

    arr.push({
      totales: {
        total_dinero: r[0].total_dinero,
        total_planta: r[0].total_planta,
        total_dinero_planta: sumaTotal,
        total_dinero_ventas: resultVentas.totalVentas,
        total_kilos: sumaKilos,
      },
    });

    if (arr.length) {
      if (arr.length == 1)
        return { detalles: arr[0].detalles, totales: arr[0].totales };
      return { detalles: arr[0].detalles, totales: arr[1].totales };
    } else return { detalles: null, totales: arr[0].totales };
  } catch (e) {
    throw e;
  }
}

async function getPrecios() {
  const sql =
    "( SELECT monto FROM precios WHERE tipo = 0 ORDER BY id_precio DESC LIMIT 1 ) UNION " +
    "( SELECT monto FROM precios WHERE tipo = 1 ORDER BY id_precio DESC LIMIT 1)";

  try {
    const conn = await getConnection();
    const result = await conn.query(sql);
    return { plant: result[0].monto, kg: result[1].monto };
  } catch (e) {
    throw e;
  }
}

async function getProyecciones(idCliente) {
  const sql = `SELECT compras.fecha_registro AS todate, DATE_FORMAT(compras.fecha_registro, '%Y-%m-%d') AS fechaRegistro, DATE_FORMAT(compras.fecha_registro, '%d-%m-%Y %r') AS fecha_registro, id_predio, nombre, DATE_FORMAT(fecha_plantar, '%Y-%m-%d') as fecha_plantar, compras.cantidad AS cantidad, compras.precio AS precio, kilos, compras.total AS total FROM compras INNER JOIN ventas ON fk_venta=id_venta INNER JOIN predios ON fk_predio=id_predio WHERE fk_comprador=${idCliente} ORDER BY compras.fecha_registro`;

  try {
    const conn = await getConnection();
    const r = await conn.query(sql);

    if (!r.length) return { tabla: 0, totales: 0 };

    let totalPlantas = 0;
    totalKilosC = 0;
    totalKilosA = 0;
    totalCompras = 0;
    totalActual = 0;

    let arr = [];

    for (let i = 0; i < r.length; ++i) {
      let tabuladores = await getTabuladores(
        r[i].id_predio,
        r[i].fecha_plantar,
        r[i].cantidad
      );

      if (r[i].kilos) totalKilosC += r[i].kilos;
      if (tabuladores.kilos) totalKilosA += tabuladores.kilos;

      totalPlantas += r[i].cantidad;
      totalCompras += r[i].total;
      totalActual += tabuladores.total;

      arr.push({
        tabla: {
          fecha: r[i].fecha_registro,
          monto: tabuladores.total - r[i].total,
        },
      });
    }
    arr.push({
      totales: {
        totalplanta: totalPlantas,
        totalKilosC,
        totalKilosA,
        totalCompras,
        totalActual,
        utilidadTotal: totalActual - totalCompras,
      },
      utilidadTotalP: Number(
        ((totalActual - totalCompras) / totalCompras) * 100
      ),
    });
    return { tabla: arr[0].tabla, totales: arr[1].totales };
  } catch (e) {
    throw e;
  }
}

module.exports = {
  getPrecios,
  getDetalleSaldo,
  getBalance,
  getProyecciones,
  getTabuladores,
  getAge,
};
