export type TipoSensor = 'temperatura' | 'humedad' | 'luz' | 'movimiento';
export type EstadoSensor = 'normal' | 'advertencia' | 'error' | 'offline';
export type EstadoConexion = 'connecting' | 'connected' | 'disconnected' | 'error';
export type SeveridadError = 'baja' | 'media' | 'alta' | 'critica';
export type TipoError = 'network' | 'server' | 'client' | 'timeout' | 'sensor';

// Ubicación del sensor
export interface UbicacionSensor {
  zona: string;
  habitacion: string;
  edificio: string;
}

// Rango de valores del sensor
export interface RangoSensor {
  min: number;
  max: number;
}

// Metadata del sensor
export interface MetadataSensor {
  nivelBateria: number;
  intensidadSenal: number;
  ultimaCalibracion: string;
}

// Información básica del sensor
export interface InfoSensor {
  id: string;
  nombre: string;
  tipo: TipoSensor;
  ubicacion: UbicacionSensor;
  unidad: string;
  rango: RangoSensor;
  rangoNormal?: RangoSensor;
  estado: EstadoSensor;
}

// Lectura completa del sensor
export interface LecturaSensor {
  id: string;
  sensorId: string;
  nombreSensor: string;
  tipo: TipoSensor;
  valor: number | boolean;
  unidad: string;
  timestamp: string;
  estado: EstadoSensor;
  ubicacion: UbicacionSensor;
  metadata: MetadataSensor;
}

// Metadata del error
export interface MetadataError {
  errorId: string;
  reintentoAutomatico: boolean;
  resolucionEstimada: string;
}

// Error del sensor
export interface ErrorSensor {
  tipo: 'error_sensor';
  codigoError: string;
  sensorId: string;
  nombreSensor: string;
  mensaje: string;
  severidad: SeveridadError;
  timestamp: string;
  ubicacion: UbicacionSensor;
  solucionProblemas: string[];
  metadata: MetadataError;
}

// Información del servidor
export interface InfoServidor {
  version: string;
  totalSensores: number;
  intervaloActualizacion: number;
}

// Estadísticas del servidor
export interface EstadisticasServidor {
  horaInicio: number;
  conexionesTotales: number;
  mensajesTotales: number;
  erroresTotal: number;
  sensoresActivos: number;
  uptime: number;
  clientesActivos: number;
  usoMemoria: any;
  timestamp: string;
}

// Mensajes WebSocket
export interface MensajeConexionEstablecida {
  tipo: 'conexion_establecida';
  mensaje: string;
  clienteId: string;
  timestamp: string;
  infoServidor: InfoServidor;
}

export interface MensajeLecturaSensor {
  tipo: 'lectura_sensor';
  datos: LecturaSensor;
  timestamp: string;
}

export interface MensajeErrorSensor {
  tipo: 'error_sensor';
  datos: ErrorSensor;
  timestamp: string;
}

export interface MensajeListaSensores {
  tipo: 'lista_sensores';
  sensores: InfoSensor[];
  timestamp: string;
}

export interface MensajeEstadisticasServidor {
  tipo: 'estadisticas_servidor';
  estadisticas: EstadisticasServidor;
  timestamp: string;
}

export interface MensajePong {
  tipo: 'pong';
  timestamp: string;
}

export interface MensajeErrorServidor {
  tipo: 'error_servidor';
  codigoError: string;
  mensaje: string;
  timestamp: string;
  severidad: SeveridadError;
}

// Union type para todos los mensajes que puede recibir el cliente
export type MensajeWebSocket = 
  | MensajeConexionEstablecida
  | MensajeLecturaSensor
  | MensajeErrorSensor
  | MensajeListaSensores
  | MensajeEstadisticasServidor
  | MensajePong
  | MensajeErrorServidor;

// Comandos que puede enviar el cliente
export interface ComandoPing {
  tipo: 'ping';
}

export interface ComandoObtenerSensores {
  tipo: 'obtener_sensores';
}

export interface ComandoObtenerEstadisticas {
  tipo: 'obtener_estadisticas_servidor';
}

export interface ComandoSuscribirSensor {
  tipo: 'suscribir_sensor';
  sensorId: string;
}

export type ComandoWebSocket = 
  | ComandoPing
  | ComandoObtenerSensores
  | ComandoObtenerEstadisticas
  | ComandoSuscribirSensor;

// Estado de la aplicación
export interface EstadoAplicacion {
  conexion: EstadoConexion;
  sensores: Map<string, InfoSensor>;
  lecturas: Map<string, LecturaSensor>;
  errores: ErrorSensor[];
  estadisticasServidor: EstadisticasServidor | null;
  clienteId: string | null;
}

// Métricas de conexión
export interface MetricasConexion {
  intentosConexion: number;
  ultimaConexion: string | null;
  tiempoSinConexion: number;
  mensajesEnviados: number;
  mensajesRecibidos: number;
  erroresConexion: number;
}

// Categorización de errores HTTP
export interface CategoriaError {
  type: TipoError;
  severity: SeveridadError;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
}

export interface EstadisticasZona {
  zona: string;
  totalSensores: number;
  sensoresActivos: number;
  sensoresInactivos: number;
  sensoresConError: number;
  sensoresConAdvertencia: number;
  porcentajeSalud: number;
  estadoPrincipal: EstadoSensor;
  ultimaActualizacion: Date;
  edificios: string[];
  habitaciones: string[];
}

// Resumen de zona
export interface ResumenZona {
  zona: string;
  estadoGeneral: EstadoSensor;
  totalSensores: number;
  sensoresActivos: number;
  porcentajeSalud: number;
  alertasActivas: number;
  sensoresPorTipo: Record<TipoSensor, number>;
}