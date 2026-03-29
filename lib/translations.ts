export const t = {
  es: {
    header: {
      back: '← Volver al inicio',
    },
    hero: {
      badge: 'Powered by TVIGILO',
      title1: 'Plan de',
      title2: 'Cobertura',
      subtitle: 'Obtén la imagen satelital de tu propiedad y diseña tu plan de cámaras de seguridad de forma visual e interactiva.',
    },
    input: {
      heading: 'Analiza tu propiedad',
      description: 'Ingresa la dirección de tu hogar o negocio y diseña un plan de cámaras de seguridad interactivo.',
      placeholder: 'Ej. 742 Elm St, Dallas, TX',
      submit: 'Analizar propiedad',
      loading: 'Preparando editor...',
      errorEmpty: 'Por favor ingresa una dirección.',
      errorShort: 'La dirección es demasiado corta.',
      examples: 'Ejemplos de direcciones',
    },
    howItWorks: {
      title: 'Cómo funciona',
      steps: [
        { title: 'Ingresa tu dirección', desc: 'Escribe la dirección de tu hogar o negocio para obtener la imagen satelital.' },
        { title: 'Imagen estilizada', desc: 'Transformamos la imagen satelital en un fondo de plano de seguridad.' },
        { title: 'Diseña y descarga', desc: 'Coloca cámaras, ajusta el campo de visión y descarga tu plan en PNG.' },
      ],
    },
    editor: {
      securityPlan: 'Plan de seguridad',
      newAddress: '← Nueva dirección',
      view: 'Vista:',
      satellite: 'Satelital',
      plan: 'Plano',
      generating: 'Generando (~30s)...',
      addCamera: 'Cámara',
      addDoorbell: 'Timbre',
      clear: 'Limpiar',
      download: 'Descargar PNG',
      noCameras: 'Sin cámaras',
      elements: 'elemento',
      elementsPlural: 'elementos',
      emptyTitle: 'Agrega tu primera cámara',
      emptyDesc: 'Usa los botones de arriba para colocar cámaras o timbres',
      hint: 'Arrastra para mover · Punto azul para rotar · ↑↓←→ para ajustar · Del para eliminar',
      loadingImage: 'Cargando imagen…',
      loadingOpenai: 'Generando con OpenAI (~30s)...',
    },
    recommendations: {
      title: 'Equipos recomendados',
      subtitle: 'Complementa tu plan de seguridad',
      buy: 'Ver producto',
      products: {
        'indoor-pro': { name: 'Indoor Pro', desc: 'Para interiores. Sin grabación de audio, cuidando tu privacidad.' },
        'outdoor-pro': { name: 'Outdoor Pro', desc: 'Para exteriores. Visión nocturna a color y ultra alta calidad.' },
        'kit-inicial': { name: 'Kit de Alarma', desc: '1 cámara + 1 alarma. El mejor punto de partida para tu seguridad.' },
        'doorbell': { name: 'Doorbell', desc: 'Doble cámara: detecta personas y paquetes. Grabación 24/7.' },
      },
    },
    error: {
      default: 'No se pudo procesar la solicitud. Intenta de nuevo.',
      unknown: 'Ocurrió un error inesperado. Intenta de nuevo.',
      transform: 'Error al transformar.',
    },
    footer: 'TVIGILO Cam Advisor — Solo para propósitos de planificación',
  },

  en: {
    header: {
      back: '← Back to home',
    },
    hero: {
      badge: 'Powered by TVIGILO',
      title1: 'Coverage',
      title2: 'Plan',
      subtitle: 'Get a satellite image of your property and design your security camera plan visually and interactively.',
    },
    input: {
      heading: 'Analyze your property',
      description: 'Enter the address of your home or business and design an interactive security camera plan.',
      placeholder: 'E.g. 742 Elm St, Dallas, TX',
      submit: 'Analyze property',
      loading: 'Preparing editor...',
      errorEmpty: 'Please enter an address.',
      errorShort: 'The address is too short.',
      examples: 'Example addresses',
    },
    howItWorks: {
      title: 'How it works',
      steps: [
        { title: 'Enter your address', desc: 'Type the address of your home or business to get the satellite image.' },
        { title: 'Stylized image', desc: 'We transform the satellite image into a security plan background.' },
        { title: 'Design and download', desc: 'Place cameras, adjust the field of view and download your plan as PNG.' },
      ],
    },
    editor: {
      securityPlan: 'Security plan',
      newAddress: '← New address',
      view: 'View:',
      satellite: 'Satellite',
      plan: 'Plan',
      generating: 'Generating (~30s)...',
      addCamera: 'Camera',
      addDoorbell: 'Doorbell',
      clear: 'Clear',
      download: 'Download PNG',
      noCameras: 'No cameras',
      elements: 'element',
      elementsPlural: 'elements',
      emptyTitle: 'Add your first camera',
      emptyDesc: 'Use the buttons above to place cameras or doorbells',
      hint: 'Drag to move · Blue dot to rotate · ↑↓←→ to adjust · Del to delete',
      loadingImage: 'Loading image…',
      loadingOpenai: 'Generating with OpenAI (~30s)...',
    },
    recommendations: {
      title: 'Recommended equipment',
      subtitle: 'Complete your security plan',
      buy: 'View product',
      products: {
        'indoor-pro': { name: 'Indoor Pro', desc: 'For indoors. No audio recording, protecting your privacy.' },
        'outdoor-pro': { name: 'Outdoor Pro', desc: 'For outdoors. Color night vision and ultra high quality.' },
        'kit-inicial': { name: 'Alarm Kit', desc: '1 camera + 1 alarm. The best starting point for your security.' },
        'doorbell': { name: 'Doorbell', desc: 'Dual camera: detects people and packages. 24/7 recording.' },
      },
    },
    error: {
      default: 'Could not process the request. Please try again.',
      unknown: 'An unexpected error occurred. Please try again.',
      transform: 'Error transforming image.',
    },
    footer: 'TVIGILO Cam Advisor — For planning purposes only',
  },
};

export type Translations = (typeof t)['es'];
export type EditorTranslations = Translations['editor'];
export type RecommendationsTranslations = Translations['recommendations'];
