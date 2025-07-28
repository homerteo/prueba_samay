import { computed, Injectable, signal } from '@angular/core';
import { ErrorSensor, EstadisticasServidor, EstadoAplicacion, EstadoConexion, EstadoSensor, InfoSensor, LecturaSensor, TipoSensor } from '../types/sensor.types';
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

  // Computed signals
  sensoresArray = computed(() => Array.from(this._sensores().values()));
  totalSensores = computed(() => this._sensores().size);
  lecturasArray = computed(() => Array.from(this._lecturas().values()));
  sensoresActivos = computed(() => 
    this.sensoresArray().filter(sensor => sensor.estado !== 'offline').length
  );
  sensoresConError = computed(() => 
    this.sensoresArray().filter(sensor => sensor.estado === 'error').length
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

  obtenerSensor(sensorId: string): InfoSensor | undefined {
    return this._sensores().get(sensorId);
  }

  obtenerUltimaLectura(sensorId: string): LecturaSensor | undefined {
    return this._lecturas().get(sensorId);
  }

  obtenerSensoresPorTipo(tipo: TipoSensor): InfoSensor[] {
    return this.sensoresArray().filter(sensor => sensor.tipo === tipo);
  }

  obtenerSensoresPorEstado(estado: EstadoSensor): InfoSensor[] {
    return this.sensoresArray().filter(sensor => sensor.estado === estado);
  }

  obtenerSensoresPorZona(zona: string): InfoSensor[] {
    return this.sensoresArray().filter(sensor => sensor.ubicacion.zona === zona);
  }

  obtenerHistorialSensor(sensorId: string, limite: number = 100): LecturaSensor[] {
    return this.lecturasArray()
      .filter(lectura => lectura.sensorId === sensorId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limite);
  }

  limpiarDatosAntiguos(): void {
    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Limpiar lecturas antiguas
    const lecturasActuales = new Map(this._lecturas());
    lecturasActuales.forEach((lectura, key) => {
      if (new Date(lectura.timestamp) < hace7dias) {
        lecturasActuales.delete(key);
      }
    });
    this._lecturas.set(lecturasActuales);

    // Limpiar errores antiguos
    const erroresRecientes = this._erroresSensor().filter(error => 
      new Date(error.timestamp) >= hace7dias
    );
    this._erroresSensor.set(erroresRecientes);
  }

  resetearEstado(): void {
    this._sensores.set(new Map());
    this._lecturas.set(new Map());
    this._erroresSensor.set([]);
    this._estadisticasServidor.set(null);
    this._clienteId.set(null);
  }

  obtenerEstadisticas() {
    const sensores = this.sensoresArray();
    const lecturas = this.lecturasArray();
    const errores = this._erroresSensor();

    return {
      sensores: {
        total: sensores.length,
        activos: sensores.filter(s => s.estado !== 'offline').length,
        conError: sensores.filter(s => s.estado === 'error').length,
        porTipo: {
          temperatura: sensores.filter(s => s.tipo === 'temperatura').length,
          humedad: sensores.filter(s => s.tipo === 'humedad').length,
          luz: sensores.filter(s => s.tipo === 'luz').length,
          movimiento: sensores.filter(s => s.tipo === 'movimiento').length
        }
      },
      lecturas: {
        total: lecturas.length,
        recientes: this.lecturasRecientes().length
      },
      errores: {
        total: errores.length,
        recientes: this.erroresRecientes().length
      },
      salud: this.estadoSalud()
    };
  }

  suscribirSensor(sensorId: string): void {
    this.webSocketService.suscribirSensor(sensorId);
  }

  actualizarSensores(): void {
    this.webSocketService.solicitarSensores();
  }

  actualizarEstadisticasServidor(): void {
    this.webSocketService.solicitarEstadisticas();
  }
}
