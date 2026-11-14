using System.ComponentModel;
using System.Diagnostics;
using FileInspector.API.Configuration;
using FileInspector.API.Contracts.Files;
using FileInspector.Application.DuplicateFiles;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace FileInspector.API.Endpoints;

public static class DuplicateFilesEndpoints
{
    public static WebApplication MapDuplicateFilesEndpoints(this WebApplication app)
    {
        app.MapGet("/api/files/duplicates", FindDuplicates)
            .WithName("FindDuplicateFiles")
            .WithSummary("Find files with duplicate names")
            .WithDescription(
                "Recursively searches the configured file root, or a subdirectory within it, " +
                "and returns every file whose name occurs more than once. Name matching is case-insensitive. " +
                "Expand the optional 'path' query parameter to select a subdirectory; leave it empty to search " +
                "the full configured root.")
            .Produces<IReadOnlyList<DuplicateFileResponse>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapDelete("/api/files/delete", DeleteFile)
            .WithName("DeleteFile")
            .WithSummary("Delete a file within the configured file root")
            .Accepts<DeleteFileRequest>("application/json")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapPost("/api/files/open-location", OpenFileLocation)
            .WithName("OpenFileLocation")
            .WithSummary("Open File Explorer with a file selected")
            .Accepts<OpenFileLocationRequest>("application/json")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status501NotImplemented);

        return app;
    }

    private static Results<NoContent, ProblemHttpResult> DeleteFile(
        [FromBody] DeleteFileRequest request,
        DuplicateFileSearchOptions options)
    {
        var fullPath = ResolveFilePath(options.AllowedRoot, request.FullPath);
        if (fullPath is null)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid file path",
                detail: "The path must identify a file inside the configured file search root.");
        }

        try
        {
            if (!File.Exists(fullPath))
            {
                return TypedResults.Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "File not found",
                    detail: "The requested file does not exist inside the configured file search root.");
            }

            if (ContainsReparsePoint(options.AllowedRoot, fullPath))
            {
                return TypedResults.Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid file path",
                    detail: "Files cannot be deleted through symbolic links or other reparse points.");
            }

            File.Delete(fullPath);
            return TypedResults.NoContent();
        }
        catch (FileNotFoundException)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "File not found",
                detail: "The requested file does not exist inside the configured file search root.");
        }
        catch (DirectoryNotFoundException)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "File not found",
                detail: "The requested file does not exist inside the configured file search root.");
        }
    }

    private static Results<NoContent, ProblemHttpResult> OpenFileLocation(
        [FromBody] OpenFileLocationRequest request,
        DuplicateFileSearchOptions options)
    {
        var fullPath = ResolveFilePath(options.AllowedRoot, request.FullPath);
        if (fullPath is null)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid file path",
                detail: "The path must identify a file inside the configured file search root.");
        }

        if (!OperatingSystem.IsWindows())
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status501NotImplemented,
                title: "File Explorer is unavailable",
                detail: "Opening a file location is only supported when the API is running on Windows.");
        }

        try
        {
            if (!File.Exists(fullPath))
            {
                return TypedResults.Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "File not found",
                    detail: "The requested file does not exist inside the configured file search root.");
            }

            if (ContainsReparsePoint(options.AllowedRoot, fullPath))
            {
                return TypedResults.Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid file path",
                    detail: "File locations cannot be opened through symbolic links or other reparse points.");
            }

            using var explorer = Process.Start(new ProcessStartInfo
            {
                FileName = "explorer.exe",
                UseShellExecute = false,
                ArgumentList = { $"/select,{fullPath}" }
            });

            if (explorer is null)
            {
                return TypedResults.Problem(
                    statusCode: StatusCodes.Status500InternalServerError,
                    title: "Could not open File Explorer",
                    detail: "Windows did not start File Explorer.");
            }

            return TypedResults.NoContent();
        }
        catch (FileNotFoundException)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "File not found",
                detail: "The requested file does not exist inside the configured file search root.");
        }
        catch (DirectoryNotFoundException)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "File not found",
                detail: "The requested file does not exist inside the configured file search root.");
        }
        catch (Win32Exception)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Could not open File Explorer",
                detail: "Windows could not start File Explorer for the requested file.");
        }
        catch (InvalidOperationException)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Could not open File Explorer",
                detail: "Windows could not start File Explorer for the requested file.");
        }
    }

    private static Results<Ok<IReadOnlyList<DuplicateFileResponse>>, ProblemHttpResult> FindDuplicates(
        [FromQuery(Name = "path")]
        [Description("Subdirectory relative to the configured base folder. Leave blank to search the entire base folder.")]
        string? relativePath,
        DuplicateFileSearchOptions options,
        IDuplicateFileSearchService searchService,
        CancellationToken cancellationToken)
    {
        var searchPath = ResolveSearchPath(options.AllowedRoot, relativePath);
        if (searchPath is null)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid search path",
                detail: "The path must be relative and remain inside the configured file search root.");
        }

        if (!Directory.Exists(searchPath))
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Directory not found",
                detail: "The requested directory does not exist inside the configured file search root.");
        }

        try
        {
            if (ContainsReparsePoint(options.AllowedRoot, searchPath))
            {
                return TypedResults.Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid search path",
                    detail: "Search paths cannot pass through symbolic links or other reparse points.");
            }

            var duplicates = searchService.FindDuplicates(searchPath, cancellationToken)
                .Select(file => new DuplicateFileResponse(
                    file.Name,
                    file.SizeInBytes,
                    file.LastModifiedUtc,
                    file.FullPath))
                .ToArray();

            return TypedResults.Ok<IReadOnlyList<DuplicateFileResponse>>(duplicates);
        }
        catch (DirectoryNotFoundException)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Directory not found",
                detail: "The requested directory does not exist inside the configured file search root.");
        }
    }

    private static string? ResolveSearchPath(string allowedRoot, string? relativePath)
    {
        var requestedPath = relativePath ?? string.Empty;
        if (Path.IsPathRooted(requestedPath))
        {
            return null;
        }

        try
        {
            var fullPath = Path.GetFullPath(Path.Combine(allowedRoot, requestedPath));
            var relativeToRoot = Path.GetRelativePath(allowedRoot, fullPath);
            if (Path.IsPathRooted(relativeToRoot) ||
                relativeToRoot == ".." ||
                relativeToRoot.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal) ||
                relativeToRoot.StartsWith($"..{Path.AltDirectorySeparatorChar}", StringComparison.Ordinal))
            {
                return null;
            }

            return fullPath;
        }
        catch (ArgumentException)
        {
            return null;
        }
        catch (NotSupportedException)
        {
            return null;
        }
        catch (PathTooLongException)
        {
            return null;
        }
    }

    private static string? ResolveFilePath(string allowedRoot, string? requestedPath)
    {
        if (string.IsNullOrWhiteSpace(requestedPath) || !Path.IsPathRooted(requestedPath))
        {
            return null;
        }

        try
        {
            var fullPath = Path.GetFullPath(requestedPath);
            var relativeToRoot = Path.GetRelativePath(allowedRoot, fullPath);
            if (relativeToRoot == "." ||
                Path.IsPathRooted(relativeToRoot) ||
                relativeToRoot == ".." ||
                relativeToRoot.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal) ||
                relativeToRoot.StartsWith($"..{Path.AltDirectorySeparatorChar}", StringComparison.Ordinal))
            {
                return null;
            }

            return fullPath;
        }
        catch (ArgumentException)
        {
            return null;
        }
        catch (NotSupportedException)
        {
            return null;
        }
        catch (PathTooLongException)
        {
            return null;
        }
    }

    private static bool ContainsReparsePoint(string allowedRoot, string searchPath)
    {
        var currentPath = searchPath;
        while (!string.Equals(currentPath, allowedRoot, StringComparison.OrdinalIgnoreCase))
        {
            if ((File.GetAttributes(currentPath) & FileAttributes.ReparsePoint) != 0)
            {
                return true;
            }

            currentPath = Directory.GetParent(currentPath)?.FullName ?? allowedRoot;
        }

        return false;
    }
}
