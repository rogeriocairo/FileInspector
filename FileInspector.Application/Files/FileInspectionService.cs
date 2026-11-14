using System.Security.Cryptography;

namespace FileInspector.Application.Files;

public sealed class FileInspectionService : IFileInspectionService
{
    public async Task<FileInspectionResult> InspectAsync(
        Stream content,
        string fileName,
        string? contentType,
        long maxSizeInBytes,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(content);
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(maxSizeInBytes);

        var safeFileName = Path.GetFileName(fileName.Replace('\\', '/'));
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        var buffer = new byte[81920];
        long sizeInBytes = 0;
        int bytesRead;

        while ((bytesRead = await content.ReadAsync(buffer, cancellationToken)) > 0)
        {
            sizeInBytes += bytesRead;
            if (sizeInBytes > maxSizeInBytes)
            {
                throw new FileTooLargeException(maxSizeInBytes);
            }

            hash.AppendData(buffer, 0, bytesRead);
        }

        return new FileInspectionResult(
            safeFileName,
            Path.GetExtension(safeFileName),
            sizeInBytes,
            string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            Convert.ToHexStringLower(hash.GetHashAndReset()));
    }
}
