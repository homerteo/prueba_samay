import { computed, Injectable, signal } from '@angular/core';
import { ComandoWebSocket, EstadoConexion, MensajeWebSocket, MetricasConexion } from '../types/sensor.types';
import { BehaviorSubject, Subject } from 'rxjs';
import { ErrorService } from './error.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private readonly WS_URL = 'ws://localhost:8080';
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 segundos
  private readonly RECONNECT_INTERVAL = 5000; // 5 segundos
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly MESSAGE_BUFFER_SIZE = 100;

  private ws: WebSocket | null = null;
  private heartbeatTimer: any = null;
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;

  // Signals para estado
  private _estadoConexion = signal<EstadoConexion>('disconnected');
  private _mensajesRecibidos = signal<MensajeWebSocket[]>([]);
  private _metricas = signal<MetricasConexion>({
    intentosConexion: 0,
    ultimaConexion: null,
    tiempoSinConexion: 0,
    mensajesEnviados: 0,
    mensajesRecibidos: 0,
    erroresConexion: 0
  });

  // Subjects para streams
  private mensajeSubject = new Subject<MensajeWebSocket>();
  private estadoSubject = new BehaviorSubject<EstadoConexion>('disconnected');

  // Buffer para mensajes mientras está desconectado
  private messageBuffer: ComandoWebSocket[] = [];

  // Readonly signals para componentes
  estadoConexion = this._estadoConexion.asReadonly();
  mensajesRecibidos = this._mensajesRecibidos.asReadonly();
  metricas = this._metricas.asReadonly();

  // Computed signals
  estaConectado = computed(() => this._estadoConexion() === 'connected');
  estaConectando = computed(() => this._estadoConexion() === 'connecting');
  tieneErrores = computed(() => this._metricas().erroresConexion > 0);

  // Observables
  mensajes$ = this.mensajeSubject.asObservable();
  estado$ = this.estadoSubject.asObservable();

  constructor(private errorService: ErrorService) {
    // Conectar signals con subjects
    this.estadoSubject.subscribe(estado => this._estadoConexion.set(estado));
    
    // Auto-conectar al inicializar
    this.conectar();
  }

  /**
   * Establece conexión WebSocket
   */
  conectar(): void {
    if (this.ws?.readyState === WebSocket.OPEN || 
        this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.actualizarEstado('connecting');
    this.actualizarMetricas({ intentosConexion: this._metricas().intentosConexion + 1 });

    try {
      this.ws = new WebSocket(this.WS_URL);
      this.configurarEventHandlers();
    } catch (error) {
      this.manejarErrorConexion(error);
    }
  }

  /**
   * Desconecta WebSocket
   */
  desconectar(): void {
    this.limpiarTimers();
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.ws.close(1000, 'Desconexión solicitada por usuario');
      this.ws = null;
    }
    
    this.actualizarEstado('disconnected');
  }

  /**
   * Envía comando al servidor
   */
  enviarComando(comando: ComandoWebSocket): boolean {
    if (this.estaConectado()) {
      try {
        this.ws?.send(JSON.stringify(comando));
        this.actualizarMetricas({ mensajesEnviados: this._metricas().mensajesEnviados + 1 });
        return true;
      } catch (error) {
        // this.errorService.registrarErrorWebSocket(`Error enviando comando: ${error}`);
        return false;
      }
    } else {
      // Agregar al buffer si está desconectado
      this.agregarAlBuffer(comando);
      return false;
    }
  }

  /**
   * Ping para verificar conexión
   */
  ping(): void {
    this.enviarComando({ tipo: 'ping' });
  }

  /**
   * Solicitar lista de sensores
   */
  solicitarSensores(): void {
    this.enviarComando({ tipo: 'obtener_sensores' });
  }

  /**
   * Solicitar estadísticas del servidor
   */
  solicitarEstadisticas(): void {
    this.enviarComando({ tipo: 'obtener_estadisticas_servidor' });
  }

  /**
   * Suscribirse a un sensor específico
   */
  suscribirSensor(sensorId: string): void {
    this.enviarComando({ tipo: 'suscribir_sensor', sensorId });
  }

  /**
   * Configura event handlers del WebSocket
   */
  private configurarEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = (event) => {
      console.log('✓ Conexión WebSocket establecida');
      this.actualizarEstado('connected');
      this.reconnectAttempts = 0;
      this.actualizarMetricas({ 
        ultimaConexion: new Date().toISOString(),
        tiempoSinConexion: 0
      });
      
      this.iniciarHeartbeat();
      this.procesarBufferMensajes();
    };

    this.ws.onmessage = (event) => {
      try {
        const mensaje: MensajeWebSocket = JSON.parse(event.data);
        this.procesarMensaje(mensaje);
        this.actualizarMetricas({ mensajesRecibidos: this._metricas().mensajesRecibidos + 1 });
      } catch (error) {
        // this.errorService.registrarErrorWebSocket(`Error parseando mensaje: ${error}`, event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`✗ Conexión WebSocket cerrada: ${event.code} - ${event.reason}`);
      this.actualizarEstado('disconnected');
      this.limpiarTimers();
      
      // Reconectar automáticamente si no fue cierre intencional
      if (event.code !== 1000 && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.programarReconexion();
      }
    };

    this.ws.onerror = (event) => {
      console.error('✗ Error de WebSocket:', event);
      this.manejarErrorConexion(event);
    };
  }

  /**
   * Procesa mensaje recibido del servidor
   */
  private procesarMensaje(mensaje: MensajeWebSocket): void {
    // Agregar a historial de mensajes
    const mensajes = this._mensajesRecibidos();
    this._mensajesRecibidos.set([mensaje, ...mensajes].slice(0, this.MESSAGE_BUFFER_SIZE));

    // Emitir a través del subject
    this.mensajeSubject.next(mensaje);

    // Manejar tipos específicos de mensaje
    switch (mensaje.tipo) {
      case 'error_sensor':
        // this.errorService.registrarErrorSensor(mensaje.datos);
        break;
      case 'error_servidor':
        // this.errorService.registrarErrorWebSocket(mensaje.mensaje, mensaje);
        break;
      case 'pong':
        // Heartbeat response - conexión OK
        break;
    }
  }

  /**
   * Maneja errores de conexión
   */
  private manejarErrorConexion(error: any): void {
    this.actualizarEstado('error');
    this.actualizarMetricas({ erroresConexion: this._metricas().erroresConexion + 1 });
    // this.errorService.registrarErrorWebSocket(error);
    
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.programarReconexion();
    }
  }

  /**
   * Programa reconexión automática
   */
  private programarReconexion(): void {
    this.reconnectAttempts++;
    const delay = this.RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts - 1); // Backoff exponencial
    
    console.log(`🔄 Reintentando conexión en ${delay}ms (intento ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.conectar();
    }, delay);
  }

  /**
   * Inicia heartbeat para mantener conexión viva
   */
  private iniciarHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.estaConectado()) {
        this.ping();
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Limpia timers
   */
  private limpiarTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Actualiza estado de conexión
   */
  private actualizarEstado(nuevoEstado: EstadoConexion): void {
    this.estadoSubject.next(nuevoEstado);
  }

  /**
   * Actualiza métricas parcialmente
   */
  private actualizarMetricas(updates: Partial<MetricasConexion>): void {
    const metricsActuales = this._metricas();
    this._metricas.set({ ...metricsActuales, ...updates });
  }

  /**
   * Agrega comando al buffer para envío posterior
   */
  private agregarAlBuffer(comando: ComandoWebSocket): void {
    this.messageBuffer.push(comando);
    
    // Mantener buffer limitado
    if (this.messageBuffer.length > this.MESSAGE_BUFFER_SIZE) {
      this.messageBuffer.shift();
    }
  }

  /**
   * Procesa mensajes del buffer cuando se reconecta
   */
  private procesarBufferMensajes(): void {
    if (this.messageBuffer.length > 0) {
      console.log(`📤 Procesando ${this.messageBuffer.length} mensajes del buffer`);
      
      this.messageBuffer.forEach(comando => {
        this.enviarComando(comando);
      });
      
      this.messageBuffer = [];
    }
  }

  /**
   * Limpia historial de mensajes
   */
  limpiarHistorial(): void {
    this._mensajesRecibidos.set([]);
  }

  /**
   * Resetea métricas
   */
  resetearMetricas(): void {
    this._metricas.set({
      intentosConexion: 0,
      ultimaConexion: null,
      tiempoSinConexion: 0,
      mensajesEnviados: 0,
      mensajesRecibidos: 0,
      erroresConexion: 0
    });
  }

  /**
   * Cleanup al destruir el servicio
   */
  ngOnDestroy(): void {
    this.desconectar();
    this.mensajeSubject.complete();
    this.estadoSubject.complete();
  }
}