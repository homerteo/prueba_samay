import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { LoadingComponent } from '../loading/loading.component';
import { StateService } from 'src/app/services/state.service';
import { WebsocketService } from 'src/app/services/websocket.service';
import { ZonaComponent } from '../zona/zona.component';

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
    CommonModule,
    HeaderComponent,
    LoadingComponent,
    ZonaComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})

export class DashboardComponent implements OnInit {
  private sensorStateService = inject(StateService);
  private webSocketService = inject(WebsocketService);

  // Estado del componente
  loading = false;

  // Signals del estado necesarios para estadisticasGenerales
  private totalSensores = this.sensorStateService.totalSensores;
  private sensoresActivos = this.sensorStateService.sensoresActivos;
  private sensoresConError = this.sensorStateService.sensoresConError;

  estadisticasGenerales = computed((): EstadisticasGenerales => {
    const total = this.totalSensores();
    const activos = this.sensoresActivos();
    const error = this.sensoresConError();
    const inactivos = total - activos - error;

    return {
      totalSensores: total,
      sensoresActivos: activos,
      sensoresInactivos: inactivos,
      sensoresConError: error,
      promedioConexion: total > 0 ? Math.round((activos / total) * 100) : 0,
      ultimaActualizacion: new Date()
    };
  });

  ngOnInit(): void {
    if (this.webSocketService.estadoConexion() === 'disconnected') {
      this.webSocketService.conectar();
    }
  }
}
