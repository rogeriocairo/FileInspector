namespace FileInspector.API.Contracts.Files;

/// <summary>Metadata extracted from an uploaded file.</summary>
public sealed record FileInspectionResponse(
    string FileName,
    string Extension,
    long SizeInBytes,
    string ContentType,
    string Sha256);
