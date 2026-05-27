# Unity C#

> `@cinacoin/unity-types` — Unity game engine integration for Cinacoin.

## Installation

Install via Unity Package Manager or download the `.unitypackage` from the releases page.

## Usage

```csharp
using Cinacoin.Unity;

var cinaConnect = new CinacoinManager(projectId: "your-project-id");
await cinaConnect.ConnectAsync();
```

## Features

- WebGL wallet connection
- In-game wallet UI
- Unity UI components

## Related

- [.NET C#](/api/dotnet)
