import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { LoadingComponent } from '../loading/loading.component';
import { SensorCardComponent } from '../sensor-card/sensor-card.component';
import { SensorListComponent } from '../sensor-list/sensor-list.component';
import { SensorDetailComponent } from '../sensor-detail/sensor-detail.component';
import { ErrorPanelComponent } from '../error-panel/error-panel.component';
import { StateService } from 'src/app/services/state.service';
import { WebsocketService } from 'src/app/services/websocket.service';
import { ErrorService } from 'src/app/services/error.service';


type VistaActiva = 'dashboard' | 'lista' | 'detalle' | 'errores' | 'configuracion';

interface EstadisticasGenerales {
  totalSensores: number;
  sensoresActivos: number;
  sensoresInactivos: number;
  sensoresConError: number;
  promedioConexion: number;
  ultimaActualizacion: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    HeaderComponent,
    LoadingComponent,
    SensorCardComponent,
    SensorListComponent,
    SensorDetailComponent,
    ErrorPanelComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})

export class DashboardComponent implements OnInit {
  private sensorStateService = inject(StateService);
  private webSocketService = inject(WebsocketService);
  private errorService = inject(ErrorService);

    // Estado del componente
  vistaActiva: VistaActiva = 'dashboard';
  loading = false;
  sensorSeleccionado: string | null = null;

    // Signals del estado
  estadoConexion = this.webSocketService.estadoConexion;
  estadisticasConexion = this.webSocketService.metricas;
  totalSensores = this.sensorStateService.totalSensores;
  sensoresActivos = this.sensorStateService.sensoresActivos;
  sensoresConAdvertencia = this.sensorStateService.sensoresConError; // Usar la misma propiedad
  sensoresConError = this.sensorStateService.sensoresConError;
  erroresRecientes = this.sensorStateService.erroresRecientes;

  estadisticasGenerales = computed((): EstadisticasGenerales => {
    const total = this.totalSensores();
    const activos = this.sensoresActivos();
    const advertencia = this.sensoresConAdvertencia();
    const error = this.sensoresConError();
    const inactivos = total - activos - advertencia - error;

    return {
      totalSensores: total,
      sensoresActivos: activos,
      sensoresInactivos: inactivos,
      sensoresConError: error + advertencia,
      promedioConexion: total > 0 ? Math.round((activos / total) * 100) : 0,
      ultimaActualizacion: new Date()
    };
  });

  ngOnInit(): void {
    if (this.estadoConexion() === 'disconnected') {
      this.webSocketService.conectar();
    }
  }

}
