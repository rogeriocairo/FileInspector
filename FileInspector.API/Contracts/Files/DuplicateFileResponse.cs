namespace FileInspector.API.Contracts.Files;

/// <summary>Metadata for one file in a duplicate-name group.</summary>
public sealed record DuplicateFileResponse(
    string Name,
    long SizeInBytes,
    DateTimeOffset LastModifiedUtc,
    string FullPath);
