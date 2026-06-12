---
sidebar_label: outbound-email-new-task
title: outbound-email-new-task
---

## Overview

Esta característica permite a los agentes crear tareas de email saliente directamente desde Flex. Los agentes pueden seleccionar una cola específica, un remitente y especificar el destinatario del email.

## Flex User Experience

Los agentes verán un formulario que les permite:
- Seleccionar una cola de las disponibles
- Elegir un remitente (incluyendo su propio email)
- Especificar el destinatario del email
- Crear la tarea de email saliente

## Setup and Dependencies

### Configuración básica

Para habilitar esta característica, configura el feature en el archivo `flex-config/ui_attributes.common.json`:

```json
"outbound_email_new_task": {
  "enabled": true,
  "remitentes": [
    "soporte@tuc empresa.com",
    "ventas@tuc empresa.com"
  ],
  "dominio": "tuc empresa.com",
  "colas_permitidas": [
    "Support Queue",
    "Sales Queue",
    "WQ1234567890abcdef"
  ]
}
```

### Parámetros de configuración

- **`enabled`**: Habilita o deshabilita la característica
- **`remitentes`**: Array de direcciones de email que pueden ser seleccionadas como remitente
- **`dominio`**: Dominio que se aplicará al email del agente cuando se use como remitente
- **`colas_permitidas`**: Array de nombres de colas o SIDs que estarán disponibles en el formulario. Si está vacío, se muestran todas las colas disponibles.

### Filtrado de colas

La característica incluye un sistema de filtrado de colas que permite controlar qué colas están disponibles para los agentes:

- Si `colas_permitidas` está vacío o no está definido, se muestran todas las colas disponibles
- Si `colas_permitidas` contiene valores, solo se muestran las colas que coincidan por nombre o SID
- Puedes especificar tanto nombres de colas como SIDs en el array

### Ejemplo de configuración

```json
"outbound_email_new_task": {
  "enabled": true,
  "remitentes": [
    "soporte@empresa.com",
    "ventas@empresa.com",
    "info@empresa.com"
  ],
  "dominio": "empresa.com",
  "colas_permitidas": [
    "Soporte Técnico",
    "Ventas",
    "WQ1234567890abcdef"
  ]
}
```

## How does it work?

1. El componente obtiene la lista de colas desde el servidor
2. Aplica el filtro de colas permitidas según la configuración
3. Muestra solo las colas que están en la lista de permitidas
4. Cuando el agente envía el formulario, se crea una tarea de email saliente con los parámetros especificados

## Notas importantes

- El email del agente se construye combinando su nombre de usuario con el dominio configurado
- Si no hay colas permitidas configuradas, se muestran todas las colas disponibles
- El filtrado funciona tanto por nombre de cola como por SID
- La configuración se puede actualizar sin reiniciar la aplicación 