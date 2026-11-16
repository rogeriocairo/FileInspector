# FileInspector

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
<img alt=".NET 10" src="https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet&logoColor=white">

A modern .NET solution for finding files with duplicate names.

FileInspector recursively searches a configured directory for files with duplicate names and exposes the results through a web interface and API.

## Overview

The solution is organized into four main projects:

- `FileInspector.API`: ASP.NET Core web application that exposes HTTP endpoints and OpenAPI documentation.
- `FileInspector.Application`: application-layer logic, orchestration, and use cases.
- `FileInspector.Domain`: core business rules, entities, and domain contracts.
- `FileInspector.Infrastructure`: integrations, persistence, and technical services.

This separation helps maintain a clean architecture and supports future growth.

## Features

- Recursive search for duplicate file names
- File name, size, last-modified date, and path display
- REST API exposure

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
│   ├── Contracts/Files/DuplicateFileResponse.cs
│   ├── Configuration/DuplicateFileSearchOptions.cs
│   ├── Endpoints/DuplicateFilesEndpoints.cs
│   ├── FileInspector.API.csproj
│   ├── FileInspector.API.http
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   └── Properties/
├── FileInspector.Application/
│   ├── DuplicateFiles/
│   │   ├── DuplicateFileEntry.cs
│   │   ├── DuplicateFileSearchService.cs
│   │   └── IDuplicateFileSearchService.cs
│   └── FileInspector.Application.csproj
├── FileInspector.Application.Tests/
│   ├── DuplicateFileSearchServiceTests.cs
│   ├── DuplicateFilesEndpointTests.cs
│   └── FileInspector.Application.Tests.csproj
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
- Swagger UI

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

The API will run locally at:

```text
http://localhost:5000
https://localhost:7011
```

In the Development environment, open the interactive API documentation at:

```text
http://localhost:5000/swagger
```

The OpenAPI document is also available at `http://localhost:5000/openapi/v1.json`.

## Find duplicate file names

The API exposes `GET /api/files/duplicates`. It recursively searches for files whose names occur more than once, matching names case-insensitively. Duplicates are identified by name only, not by file content.

The default search root is the `FileInspector.API/Files` directory. The application creates it at startup if needed. To change it, set `FileSearch:AllowedRoot` in `appsettings.json` or override it with the `FileSearch__AllowedRoot` environment variable. Relative configured roots are resolved from the API content directory.

On Windows, set a persistent user environment variable and restart the terminal or IDE:

```powershell
[Environment]::SetEnvironmentVariable(
    'FileSearch__AllowedRoot',
    'C:\Your\Search\Root',
    'User')
```

For the current terminal session only, use `$env:FileSearch__AllowedRoot = 'C:\Your\Search\Root'` before starting the API.

In Swagger UI, expand **GET `/api/files/duplicates`** to see the optional query parameter named `path`. Leave it blank to search the entire configured base directory, or enter a relative subdirectory such as `Samples` to search recursively under `<base directory>\Samples`. Absolute paths and attempts to traverse outside the base directory are rejected.

Each result contains the file name, size in bytes, last-modified date in UTC, and full file path:

```http
GET http://localhost:5000/api/files/duplicates?path=Samples
```

The route is available in Swagger UI and in `FileInspector.API.http`. It returns `400 Bad Request` for invalid paths, `404 Not Found` when the selected directory does not exist, and `200 OK` with an empty list when no duplicate names are found.

## Tests

The xUnit project contains service unit tests and API endpoint tests, including checks that the `path` query cannot escape the configured base directory. Run the tests from the solution root:

```powershell
dotnet test .\FileInspector.slnx
```

## Architecture

The project follows a layered architecture:

- `Domain`: core business logic and models
- `Application`: orchestration and business use cases
- `Infrastructure`: technical implementations and integrations
- `API`: external interface exposed to clients

This structure favors maintainability, scalability, and automated testing.

## Roadmap

Planned next steps:

1. Add tests for recursive duplicate-name search and filesystem edge cases
2. Improve API usability and documentation

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
