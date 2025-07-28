import { Injectable, signal } from '@angular/core';
import { CategoriaError, ErrorSensor } from '../types/sensor.types';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private _errores = signal<ErrorSensor[]>([]);
  private _errorLog = signal<string[]>([]);

  // Readonly signals para componentes
  errores = this._errores.asReadonly();
  errorLog = this._errorLog.asReadonly();

  constructor() {}

  /**
   * Categoriza un error HTTP según su status code
   */
  categorizarErrorHttp(status: number, message: string): CategoriaError {
    switch (status) {
      case 0:
        return {
          type: 'network',
          severity: 'alta',
          retryable: true,
          userMessage: 'Sin conexión a internet. Revisa tu conexión de red.',
          technicalMessage: `Network error: ${message}`
        };
      case 401:
        return {
          type: 'client',
          severity: 'media',
          retryable: false,
          userMessage: 'Sesión expirada, por favor inicia sesión nuevamente.',
          technicalMessage: `Unauthorized: ${message}`
        };
      case 403:
        return {
          type: 'client',
          severity: 'media',
          retryable: false,
          userMessage: 'No tienes permisos para realizar esta acción.',
          technicalMessage: `Forbidden: ${message}`
        };
      case 404:
        return {
          type: 'client',
          severity: 'baja',
          retryable: false,
          userMessage: 'El recurso solicitado no fue encontrado.',
          technicalMessage: `Not Found: ${message}`
        };
      case 408:
        return {
          type: 'timeout',
          severity: 'media',
          retryable: true,
          userMessage: 'La solicitud tardó demasiado tiempo. Intenta nuevamente.',
          technicalMessage: `Request Timeout: ${message}`
        };
      case 500:
        return {
          type: 'server',
          severity: 'alta',
          retryable: true,
          userMessage: 'Error interno del servidor. Intenta más tarde.',
          technicalMessage: `Internal Server Error: ${message}`
        };
      case 502:
        return {
          type: 'server',
          severity: 'alta',
          retryable: true,
          userMessage: 'Servidor no disponible temporalmente.',
          technicalMessage: `Bad Gateway: ${message}`
        };
      case 503:
        return {
          type: 'server',
          severity: 'alta',
          retryable: true,
          userMessage: 'Servicio no disponible. Intenta en unos minutos.',
          technicalMessage: `Service Unavailable: ${message}`
        };
      default:
        return {
          type: status >= 400 && status < 500 ? 'client' : 'server',
          severity: 'media',
          retryable: status >= 500,
          userMessage: 'Error inesperado. Por favor intenta de nuevo.',
          technicalMessage: `HTTP ${status}: ${message}`
        };
    }
  }

  /**
   * Registra un error de sensor
   */
  registrarErrorSensor(error: ErrorSensor): void {
    const erroresActuales = this._errores();
    this._errores.set([error, ...erroresActuales].slice(0, 100)); // Mantener solo últimos 100 errores
    
    this.logError(`SENSOR_ERROR`, error.codigoError, error.mensaje, {
      sensorId: error.sensorId,
      severidad: error.severidad,
      ubicacion: error.ubicacion
    });
  }

  /**
   * Registra un error de WebSocket
   */
  registrarErrorWebSocket(event: Event | string, context?: any): void {
    const mensaje = typeof event === 'string' ? event : `WebSocket error: ${event.type}`;
    
    this.logError(`WEBSOCKET_ERROR`, 'Connection Error', mensaje, {
      event: typeof event === 'object' ? event.type : event,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Logger interno
   */
  private logError(type: string, source: string, message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    const errorId = this.generarErrorId();
    
    const logEntry = `[${timestamp}] [${errorId}] ${type} - ${source}: ${message}`;
    
    const logActual = this._errorLog();
    this._errorLog.set([logEntry, ...logActual].slice(0, 1000)); // Mantener últimas 1000 entradas

    console.error(logEntry, metadata);
  }

  /**
   * Genera un ID único para el error
   */
  private generarErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}
