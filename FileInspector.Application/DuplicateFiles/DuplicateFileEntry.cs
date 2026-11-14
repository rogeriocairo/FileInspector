namespace FileInspector.Application.DuplicateFiles;

public sealed record DuplicateFileEntry(
    string Name,
    long SizeInBytes,
    DateTimeOffset LastModifiedUtc,
    string FullPath);
