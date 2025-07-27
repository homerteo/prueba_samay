import { computed, Injectable, signal } from '@angular/core';
import { ComandoWebSocket, EstadoConexion, MensajeWebSocket, MetricasConexion } from '../types/sensor.types';
import { BehaviorSubject, Subject } from 'rxjs';
import { ErrorService } from './error.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private readonly WS_URL = 'ws://localhost:8080';
  private readonly HEARTBEAT_INTERVAL = 30000; 
  private readonly RECONNECT_INTERVAL = 5000; 
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

    this.estadoSubject.next('connecting');
    this.actualizarMetricas({ intentosConexion: this._metricas().intentosConexion + 1 });

    try {
      this.ws = new WebSocket(this.WS_URL);
    } catch (error) {
      console.log(error);
    }
  }

  desconectar() {
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close(1000, 'Desconexión solicitada por usuario');
      this.ws = null;
    }
    this.estadoSubject.next('disconnected');
  }

  private actualizarMetricas(updates: Partial<MetricasConexion>): void {
    const metricsActuales = this._metricas();
    this._metricas.set({ ...metricsActuales, ...updates });
  }
  
}
