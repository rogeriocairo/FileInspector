namespace FileInspector.Application.Files;

public interface IFileInspectionService
{
    Task<FileInspectionResult> InspectAsync(
        Stream content,
        string fileName,
        string? contentType,
        long maxSizeInBytes,
        CancellationToken cancellationToken);
}
