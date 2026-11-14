namespace FileInspector.API.Contracts.Files;

/// <summary>Multipart request containing the file to inspect.</summary>
public sealed record FileInspectionUploadRequest
{
    /// <summary>The file supplied in the multipart form field named "file".</summary>
    public required IFormFile File { get; init; }
}
