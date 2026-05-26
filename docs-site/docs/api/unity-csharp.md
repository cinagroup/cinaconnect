# Unity C#

> `@cinaconnect/unity-types` — Unity game engine integration for CinaConnect.

## Installation

Install via Unity Package Manager or download the `.unitypackage` from the releases page.

## Usage

```csharp
using CinaConnect.Unity;

var cinaConnect = new CinaConnectManager(projectId: "your-project-id");
await cinaConnect.ConnectAsync();
```

## Features

- WebGL wallet connection
- In-game wallet UI
- Unity UI components

## Related

- [.NET C#](/api/dotnet)
