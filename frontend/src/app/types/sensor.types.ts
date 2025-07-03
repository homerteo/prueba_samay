/*
  TODO: Definir todas las interfaces TypeScript para el proyecto
  
  El servidor WebSocket envía estos tipos de datos:
  
  1. Mensaje de conexión establecida
  2. Lecturas de sensores en tiempo real
  3. Errores de sensores
  4. Lista de sensores disponibles
  5. Estadísticas del servidor
  
  Debes crear interfaces para todos estos tipos de datos.
  Recuerda usar union types, enums y genéricos donde sea apropiado.
*/

// Ejemplo de cómo empezar:

export type TipoSensor = 'temperatura' | 'humedad' | 'luz' | 'movimiento';

export type EstadoSensor = 'normal' | 'advertencia' | 'error' | 'offline';

// TODO: Crear todas las interfaces necesarias para:
// - LecturaSensor
// - ErrorSensor
// - MensajeWebSocket
// - EstadoConexion
// - InfoSensor
// - EstadisticasServidor
// - Y cualquier otra interfaz que necesites

export interface SensorBase {
  id: string;
  nombre: string;
  tipo: TipoSensor;
  // TODO: Completar esta interface
}

// TODO: Implementar el resto de interfaces aquí