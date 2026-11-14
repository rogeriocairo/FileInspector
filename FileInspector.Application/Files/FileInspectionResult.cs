namespace FileInspector.Application.Files;

public sealed record FileInspectionResult(
    string FileName,
    string Extension,
    long SizeInBytes,
    string ContentType,
    string Sha256);
