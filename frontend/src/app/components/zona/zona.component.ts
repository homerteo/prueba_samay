import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { StateService } from 'src/app/services/state.service';
import { RangoSensor, TipoSensor } from 'src/app/types/sensor.types';

@Component({
  selector: 'app-zona',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zona.component.html',
  styleUrl: './zona.component.css'
})
export class ZonaComponent {
  @Input() mostrarDetalle: boolean = true;
  @Output() zonaSeleccionada = new EventEmitter<string>();

  public stateService = inject(StateService);

  // Signals del servicio
  resumenZonas = this.stateService.resumenZonas;
  zonaMejorSalud = this.stateService.zonaMejorSalud;
  zonaPeorSalud = this.stateService.zonaPeorSalud;

  // Constantes
  tiposSensores: TipoSensor[] = ['temperatura', 'humedad', 'luz', 'movimiento'];

  // Computed para estadísticas generales
  totalZonas = () => this.resumenZonas().length;
  zonasSaludables = () => this.resumenZonas().filter(z => z.porcentajeSalud >= 80).length;
  zonasConAlertas = () => this.resumenZonas().filter(z => z.alertasActivas > 0).length;

  ngOnInit(): void {
    console.log('🏢 ZonaOverviewComponent inicializado');
    console.log('📊 Total sensores:', this.stateService.sensores().size);
    console.log('🏗️ Zonas únicas:', this.stateService.zonasUnicas());
    console.log('📋 Resumen zonas:', this.resumenZonas());
  }

  onZonaClick(zona: string): void {
    this.zonaSeleccionada.emit(zona);
  }

  obtenerSensoresDeZona(zona: string) {
    const sensoresPorZona = this.stateService.sensoresPorZona();
    return sensoresPorZona.get(zona) || [];
  }

  obtenerLecturaSensor(sensorId: string) {
    const lecturas = this.stateService.lecturas();
    return lecturas.get(sensorId);
  }

  formatearValor(valor: any): string {
    if (typeof valor === 'number') {
      return valor.toFixed(1);
    }
    return String(valor);
  }

  getRangoEstado(valor: number, rango: RangoSensor | undefined): string {
    if (!rango || valor < rango.min || valor > rango.max) {
      return 'fuera-rango';
    }
    return 'en-rango';
  }

  getRangoTexto(valor: number, rango: RangoSensor | undefined): string {
    if (!rango || valor < rango.min || valor > rango.max) {
      return 'Fuera de rango';
    }
    return 'Normal';
  }

  esNumero(valor: any): boolean {
    return typeof valor === 'number';
  }

  obtenerValorNumerico(valor: any): number {
    return typeof valor === 'number' ? valor : 0;
  }

  tieneRangoNormal(sensor: any): boolean {
    return sensor.rangoNormal && typeof sensor.rangoNormal === 'object';
  }

  getZonaClass(estado: string): string {
    return estado;
  }

  getZonaIcon(estado: string): string {
    switch (estado) {
      case 'normal': return '✅';
      case 'advertencia': return '⚠️';
      case 'error': return '❌';
      case 'offline': return '⭕';
      default: return '❓';
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'normal': return 'Normal';
      case 'advertencia': return 'Advertencia';
      case 'error': return 'Error';
      case 'offline': return 'Offline';
      default: return 'Desconocido';
    }
  }

  getTipoIcon(tipo: TipoSensor): string {
    switch (tipo) {
      case 'temperatura': return '🌡️';
      case 'humedad': return '💧';
      case 'luz': return '💡';
      case 'movimiento': return '🚶';
      default: return '📊';
    }
  }

  getTipoLabel(tipo: TipoSensor): string {
    switch (tipo) {
      case 'temperatura': return 'Temperatura';
      case 'humedad': return 'Humedad';
      case 'luz': return 'Luz';
      case 'movimiento': return 'Movimiento';
      default: return 'Desconocido';
    }
  }

  getHealthBarClass(porcentaje: number): string {
    if (porcentaje >= 90) return 'excellent';
    if (porcentaje >= 70) return 'good';
    if (porcentaje >= 50) return 'warning';
    return 'critical';
  }
}
