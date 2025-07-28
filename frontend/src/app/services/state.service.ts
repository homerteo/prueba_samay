import { computed, Injectable, signal } from '@angular/core';
import { ErrorSensor, EstadisticasServidor, EstadoAplicacion, EstadoConexion, InfoSensor, LecturaSensor } from '../types/sensor.types';
import { BehaviorSubject } from 'rxjs';
import { WebsocketService } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  // Signals privados
  private _estadoConexion = signal<EstadoConexion>('disconnected');
  private _sensores = signal<Map<string, InfoSensor>>(new Map());
  private _lecturas = signal<Map<string, LecturaSensor>>(new Map());
  private _erroresSensor = signal<ErrorSensor[]>([]);
  private _estadisticasServidor = signal<EstadisticasServidor | null>(null);
  private _clienteId = signal<string | null>(null);

  // para tener compatibilidad del estado con rxjs
  private estadoSubject = new BehaviorSubject<EstadoAplicacion>(this.obtenerEstadoCompleto());

  // Signals publicos
  estadoConexion = this._estadoConexion.asReadonly();
  sensores = this._sensores.asReadonly();
  lecturas = this._lecturas.asReadonly();
  erroresSensor = this._erroresSensor.asReadonly();
  estadisticasServidor = this._estadisticasServidor.asReadonly();
  clienteId = this._clienteId.asReadonly();

    // Computed signals para datos derivados
  sensoresArray = computed(() => Array.from(this._sensores().values()));
  lecturasArray = computed(() => Array.from(this._lecturas().values()));
  totalSensores = computed(() => this._sensores().size);
  sensoresActivos = computed(() => 
    this.sensoresArray().filter(sensor => sensor.estado !== 'offline').length
  );
  sensoresConError = computed(() => 
    this.sensoresArray().filter(sensor => sensor.estado === 'error').length
  );
  
  // Sensores por tipo
  sensoresTemperatura = computed(() => 
    this.sensoresArray().filter(sensor => sensor.tipo === 'temperatura')
  );
  sensoresHumedad = computed(() => 
    this.sensoresArray().filter(sensor => sensor.tipo === 'humedad')
  );
  sensoresLuz = computed(() => 
    this.sensoresArray().filter(sensor => sensor.tipo === 'luz')
  );
  sensoresMovimiento = computed(() => 
    this.sensoresArray().filter(sensor => sensor.tipo === 'movimiento')
  );
  lecturasRecientes = computed(() => {
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.lecturasArray().filter(lectura => 
      new Date(lectura.timestamp) > hace24h
    );
  });
  erroresRecientes = computed(() => {
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this._erroresSensor().filter(error => 
      new Date(error.timestamp) > hace24h
    );
  });
  estadoSalud = computed(() => {
    const total = this.totalSensores();
    const activos = this.sensoresActivos();
    const conError = this.sensoresConError();
    
    if (total === 0) return 'sin-datos';
    if (conError > total * 0.5) return 'critico';
    if (conError > total * 0.2) return 'advertencia';
    if (activos === total) return 'saludable';
    return 'normal';
  });

  //observable del estado para compatibilidad con rxjs 
  estado$ = this.estadoSubject.asObservable();

  constructor(private webSocketService: WebsocketService) {
    this.inicializar();
  }
  private inicializar(): void {
    // Suscribirse al estado de conexión
    this.webSocketService.estado$.subscribe(estado => {
      this.actualizarEstadoConexion(estado);
    });

    // Suscribirse a mensajes WebSocket
    this.webSocketService.mensajes$.subscribe(mensaje => {
      this.procesarMensajeWebSocket(mensaje);
    });
  }

    private procesarMensajeWebSocket(mensaje: any): void {
    switch (mensaje.tipo) {
      case 'conexion_establecida':
        this._clienteId.set(mensaje.clienteId);
        // Solicitar lista inicial de sensores
        this.webSocketService.solicitarSensores();
        break;

      case 'lista_sensores':
        this.actualizarListaSensores(mensaje.sensores);
        break;

      case 'lectura_sensor':
        this.actualizarLecturaSensor(mensaje.datos);
        break;

      case 'error_sensor':
        this.agregarErrorSensor(mensaje.datos);
        break;

      case 'estadisticas_servidor':
        this._estadisticasServidor.set(mensaje.estadisticas);
        break;
    }

    // Emitir estado actualizado
    this.estadoSubject.next(this.obtenerEstadoCompleto());
  }

  agregarErrorSensor(error: ErrorSensor): void {
    const erroresActuales = this._erroresSensor();
    this._erroresSensor.set([error, ...erroresActuales].slice(0, 1000)); // Mantener últimos 1000

    // Marcar sensor como error
    const sensoresActuales = new Map(this._sensores());
    const sensor = sensoresActuales.get(error.sensorId);
    
    if (sensor) {
      const sensorActualizado: InfoSensor = {
        ...sensor,
        estado: 'error'
      };
      sensoresActuales.set(error.sensorId, sensorActualizado);
      this._sensores.set(sensoresActuales);
    }
  }

  private obtenerEstadoCompleto(): EstadoAplicacion {
    return {
      conexion: this._estadoConexion(),
      sensores: this._sensores(),
      lecturas: this._lecturas(),
      errores: this._erroresSensor(),
      estadisticasServidor: this._estadisticasServidor(),
      clienteId: this._clienteId()
    };
  }

  actualizarEstadoConexion(estado: EstadoConexion): void {
    this._estadoConexion.set(estado);
    
    // Si se desconectó, marcar sensores como offline
    if (estado === 'disconnected' || estado === 'error') {
      this.marcarSensoresOffline();
    }
  }

  actualizarListaSensores(sensores: InfoSensor[]): void {
    const nuevoMapaSensores = new Map<string, InfoSensor>();
    
    sensores.forEach(sensor => {
      nuevoMapaSensores.set(sensor.id, sensor);
    });
    
    this._sensores.set(nuevoMapaSensores);
  }

  private marcarSensoresOffline(): void {
    const sensoresActuales = new Map(this._sensores());
    
    sensoresActuales.forEach((sensor, id) => {
      if (sensor.estado !== 'offline') {
        sensoresActuales.set(id, { ...sensor, estado: 'offline' });
      }
    });
    
    this._sensores.set(sensoresActuales);
  }

    actualizarLecturaSensor(lectura: LecturaSensor): void {
    // Actualizar lectura
    const lecturasActuales = new Map(this._lecturas());
    lecturasActuales.set(lectura.sensorId, lectura);
    this._lecturas.set(lecturasActuales);

    // Actualizar estado del sensor
    const sensoresActuales = new Map(this._sensores());
    const sensor = sensoresActuales.get(lectura.sensorId);
    
    if (sensor) {
      const sensorActualizado: InfoSensor = {
        ...sensor,
        estado: lectura.estado
      };
      sensoresActuales.set(lectura.sensorId, sensorActualizado);
      this._sensores.set(sensoresActuales);
    }
  }
}
