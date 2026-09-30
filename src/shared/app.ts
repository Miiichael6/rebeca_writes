/** Única fuente del nombre de la app. Se usa en main, preload, renderer e index.html. */
export const APP_NAME = 'RebeccaWrites'
/** Título visible de la ventana: en desarrollo (`npm run dev`) lleva el sufijo "development". */
export const appTitle = (dev: boolean): string => (dev ? `${APP_NAME} - development` : APP_NAME)
export const APP_ID = 'com.rebeccawrites.app'
