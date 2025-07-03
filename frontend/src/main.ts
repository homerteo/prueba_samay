import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';

// TODO: Importar tu componente principal aquí
// import { AppComponent } from './app/app.component';

// Componente temporal hasta que crees el tuyo
import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-root',
  template: `
    <div style="
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
      color: white;
      text-align: center;
      padding: 20px;
    ">
      <div>
        <h1 style="margin-bottom: 1rem;">🚀 Dashboard IoT - Prueba Técnica</h1>
        <div style="
          background: white;
          color: #333;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          max-width: 600px;
        ">
          <h2 style="color: #3b82f6; margin-bottom: 1rem;">¡Bienvenido, Desarrollador!</h2>
          <p style="margin-bottom: 1rem; line-height: 1.6;">
            Esta es tu prueba técnica. Debes crear un dashboard completo de sensores IoT
            usando Angular 17+ con Standalone Components, Signals, WebSockets y más.
          </p>
          <div style="
            background: #f8fafc;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            text-align: left;
          ">
            <h3 style="margin: 0 0 0.5rem 0; color: #1f2937;">Instrucciones:</h3>
            <ol style="margin: 0; padding-left: 1.5rem; color: #6b7280;">
              <li>Crea tu componente principal y actualiza main.ts</li>
              <li>Implementa el WebSocket service para conectar a ws://localhost:8080</li>
              <li>Usa Signals para el estado reactivo</li>
              <li>Crea HTTP interceptors para manejo de errores</li>
              <li>Diseña una UI moderna y responsiva</li>
            </ol>
          </div>
          <p style="
            background: #dbeafe;
            color: #1e40af;
            padding: 0.75rem;
            border-radius: 6px;
            margin: 1rem 0;
            font-weight: 600;
          ">
            📊 Servidor WebSocket corriendo en: ws://localhost:8080
          </p>
          <p style="font-size: 0.9rem; color: #6b7280;">
            Revisa el README.md para instrucciones detalladas
          </p>
        </div>
      </div>
    </div>
  `
})
class TempAppComponent {}

bootstrapApplication(TempAppComponent, {
  providers: [
    provideHttpClient(),
    // TODO: Agregar tus providers aquí (interceptors, servicios, etc.)
  ]
}).catch(err => console.error(err));