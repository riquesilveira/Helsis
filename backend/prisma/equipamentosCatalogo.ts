/**
 * Catálogo de referência de equipamentos médicos de imagem — usado para
 * popular a tabela `EquipamentoCatalogo`, que alimenta o autocomplete de
 * tipo/marca/modelo no formulário de novo equipamento. Não é uma lista
 * fechada: o usuário pode sempre digitar algo que não esteja aqui.
 */
export const EQUIPAMENTOS_CATALOGO: { tipo: string; marca: string; modelo: string }[] = [
  // Ressonância Magnética
  { tipo: "Ressonância Magnética", marca: "Siemens", modelo: "Magnetom Essenza" },
  { tipo: "Ressonância Magnética", marca: "Siemens", modelo: "Magnetom Aera" },
  { tipo: "Ressonância Magnética", marca: "Siemens", modelo: "Magnetom Sola" },
  { tipo: "Ressonância Magnética", marca: "Siemens", modelo: "Magnetom Vida" },
  { tipo: "Ressonância Magnética", marca: "GE Healthcare", modelo: "Signa Explorer" },
  { tipo: "Ressonância Magnética", marca: "GE Healthcare", modelo: "Signa Voyager" },
  { tipo: "Ressonância Magnética", marca: "GE Healthcare", modelo: "Signa Artist" },
  { tipo: "Ressonância Magnética", marca: "GE Healthcare", modelo: "Optima MR360" },
  { tipo: "Ressonância Magnética", marca: "Philips", modelo: "Ingenia 1.5T" },
  { tipo: "Ressonância Magnética", marca: "Philips", modelo: "Achieva" },
  { tipo: "Ressonância Magnética", marca: "Philips", modelo: "Ambition" },
  { tipo: "Ressonância Magnética", marca: "Canon Medical", modelo: "Vantage Orian" },
  { tipo: "Ressonância Magnética", marca: "Canon Medical", modelo: "Vantage Galan" },
  { tipo: "Ressonância Magnética", marca: "Hitachi", modelo: "Echelon Oval" },
  { tipo: "Ressonância Magnética", marca: "Hitachi", modelo: "Aperto Lucent" },

  // Tomógrafo (CT)
  { tipo: "Tomógrafo", marca: "GE Healthcare", modelo: "Revolution EVO" },
  { tipo: "Tomógrafo", marca: "GE Healthcare", modelo: "Revolution CT" },
  { tipo: "Tomógrafo", marca: "GE Healthcare", modelo: "Optima CT660" },
  { tipo: "Tomógrafo", marca: "GE Healthcare", modelo: "BrightSpeed" },
  { tipo: "Tomógrafo", marca: "Siemens", modelo: "Somatom Definition" },
  { tipo: "Tomógrafo", marca: "Siemens", modelo: "Somatom go.Up" },
  { tipo: "Tomógrafo", marca: "Siemens", modelo: "Somatom Force" },
  { tipo: "Tomógrafo", marca: "Philips", modelo: "Ingenuity Core" },
  { tipo: "Tomógrafo", marca: "Philips", modelo: "Incisive CT" },
  { tipo: "Tomógrafo", marca: "Philips", modelo: "Brilliance" },
  { tipo: "Tomógrafo", marca: "Canon Medical", modelo: "Aquilion Prime" },
  { tipo: "Tomógrafo", marca: "Canon Medical", modelo: "Aquilion One" },
  { tipo: "Tomógrafo", marca: "Toshiba", modelo: "Alexion" },

  // Mamógrafo
  { tipo: "Mamógrafo Digital", marca: "Hologic", modelo: "3Dimensions" },
  { tipo: "Mamógrafo Digital", marca: "Hologic", modelo: "Selenia Dimensions" },
  { tipo: "Mamógrafo Digital", marca: "GE Healthcare", modelo: "Senographe Pristina" },
  { tipo: "Mamógrafo Digital", marca: "GE Healthcare", modelo: "Senographe Essential" },
  { tipo: "Mamógrafo Digital", marca: "Siemens", modelo: "Mammomat Revelation" },
  { tipo: "Mamógrafo Digital", marca: "Siemens", modelo: "Mammomat Fusion" },
  { tipo: "Mamógrafo Digital", marca: "Fujifilm", modelo: "Amulet Innovality" },

  // Raio-X
  { tipo: "Raio-X Digital", marca: "Philips", modelo: "DigitalDiagnost C90" },
  { tipo: "Raio-X Digital", marca: "Philips", modelo: "DigitalDiagnost C50" },
  { tipo: "Raio-X Digital", marca: "GE Healthcare", modelo: "Definium 8000" },
  { tipo: "Raio-X Digital", marca: "GE Healthcare", modelo: "Optima XR646" },
  { tipo: "Raio-X Digital", marca: "Siemens", modelo: "Ysio Max" },
  { tipo: "Raio-X Digital", marca: "Siemens", modelo: "Multix Impact" },
  { tipo: "Raio-X Digital", marca: "Carestream", modelo: "DRX-Evolution" },
  { tipo: "Raio-X Digital", marca: "Fujifilm", modelo: "FDR Go Plus" },

  // Ultrassom
  { tipo: "Ultrassom Doppler", marca: "Samsung", modelo: "HERA W10" },
  { tipo: "Ultrassom Doppler", marca: "Samsung", modelo: "HS70A" },
  { tipo: "Ultrassom Doppler", marca: "GE Healthcare", modelo: "Voluson E10" },
  { tipo: "Ultrassom Doppler", marca: "GE Healthcare", modelo: "Logiq E10" },
  { tipo: "Ultrassom Doppler", marca: "Philips", modelo: "EPIQ 7" },
  { tipo: "Ultrassom Doppler", marca: "Philips", modelo: "Affiniti 70" },
  { tipo: "Ultrassom Doppler", marca: "Siemens", modelo: "Acuson Sequoia" },
  { tipo: "Ultrassom Doppler", marca: "Siemens", modelo: "Acuson S2000" },
  { tipo: "Ultrassom Doppler", marca: "Mindray", modelo: "Resona 7" },

  // Densitometria óssea
  { tipo: "Densitômetro Ósseo", marca: "Hologic", modelo: "Horizon DXA" },
  { tipo: "Densitômetro Ósseo", marca: "GE Healthcare", modelo: "Lunar Prodigy" },

  // Arco cirúrgico (fluoroscopia móvel)
  { tipo: "Arco Cirúrgico", marca: "Siemens", modelo: "Cios Alpha" },
  { tipo: "Arco Cirúrgico", marca: "GE Healthcare", modelo: "OEC Elite" },
  { tipo: "Arco Cirúrgico", marca: "Philips", modelo: "BV Pulsera" },
];
