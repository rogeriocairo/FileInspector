# FileInspector

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
<img alt=".NET 10" src="https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet&logoColor=white">

A modern .NET solution for file inspection, analysis, and metadata processing.

FileInspector is designed to help inspect files and directories, extract useful information, and expose that data through a clean API layer. The project follows a layered architecture to keep the codebase maintainable, testable, and easy to extend.

## Overview

The solution is organized into four main projects:

- `FileInspector.API`: ASP.NET Core web application that exposes HTTP endpoints and OpenAPI documentation.
- `FileInspector.Application`: application-layer logic, orchestration, and use cases.
- `FileInspector.Domain`: core business rules, entities, and domain contracts.
- `FileInspector.Infrastructure`: integrations, persistence, and technical services.

This separation helps maintain a clean architecture and supports future growth.

## Features

- File and directory inspection
- Metadata extraction
- File content validation and analysis
- Structured data processing
- REST API exposure
- Extensible integration points for future automation workflows

## Requirements

Before running the project, make sure you have:

- .NET SDK 10.0 or newer
- Git
- Visual Studio, VS Code, or Rider

## Project structure

```text
FileInspector/
├── FileInspector.API/
│   ├── Program.cs
│   ├── FileInspector.API.csproj
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   └── Properties/
├── FileInspector.Application/
│   ├── Class1.cs
│   └── FileInspector.Application.csproj
├── FileInspector.Domain/
│   ├── Class1.cs
│   └── FileInspector.Domain.csproj
├── FileInspector.Infrastructure/
│   ├── Class1.cs
│   └── FileInspector.Infrastructure.csproj
├── FileInspector.slnx
├── .gitignore
├── LICENSE
├── README.md
└── .vscode/
```

## Technologies

- ASP.NET Core
- .NET 10
- C#
- OpenAPI

## Getting started

### 1. Restore dependencies

```bash
dotnet restore
```

### 2. Build the solution

```bash
dotnet build
```

### 3. Run the API

```bash
dotnet run --project FileInspector.API
```

The API will run locally on the default ASP.NET Core ports, such as:

```text
https://localhost:5001
http://localhost:5000
```

> The initial scaffold includes a sample endpoint named `GET /weatherforecast`, which can be replaced with the actual file-inspection logic as the project evolves.

## Architecture

The project follows a layered architecture:

- `Domain`: core business logic and models
- `Application`: orchestration and business use cases
- `Infrastructure`: technical implementations and integrations
- `API`: external interface exposed to clients

This structure favors maintainability, scalability, and automated testing.

## Roadmap

Planned next steps:

1. Define the core file inspection models and business rules
2. Implement validation and analysis services in `Application`
3. Build persistence and technical integrations in `Infrastructure`
4. Expose real endpoints in `API`
5. Add unit and integration tests
6. Improve API usability and documentation

## Contributing

Contributions are welcome. To contribute:

```bash
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
```

Issues and feature discussions are also welcome before proposing major changes.

## License

This project is licensed under the MIT License.

The MIT license allows commercial and personal use, modification, redistribution, and sublicensing, provided the copyright notice and license are preserved.

I, the author, retain the copyright to the project and grant public use of the code under the MIT License terms.

See the full text in [LICENSE](./LICENSE).
