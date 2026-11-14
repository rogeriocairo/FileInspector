using System.ComponentModel;
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

        return app;
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
