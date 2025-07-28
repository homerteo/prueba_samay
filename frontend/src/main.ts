import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';

// TODO: Importar tu componente principal aquí
// import { AppComponent } from './app/app.component';

// Componente temporal hasta que crees el tuyo
import { Component } from '@angular/core';
import { WebsocketService } from './app/services/websocket.service';
import { ErrorService } from './app/services/error.service';
import { StateService } from './app/services/state.service';
import { DashboardComponent } from './app/components/dashboard/dashboard.component';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [DashboardComponent],
  template: `
    <div class="app-container">
      <main>
        <app-dashboard />
      </main>
    
    </div>
  `
})
class TempAppComponent {}

bootstrapApplication(TempAppComponent, {
  providers: [
    provideHttpClient(),
    WebsocketService,
    ErrorService,
    StateService
    // TODO: Agregar tus providers aquí (interceptors, servicios, etc.)
  ]
}).catch(err => console.error(err));