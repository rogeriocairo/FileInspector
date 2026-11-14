namespace FileInspector.Application.Files;

public sealed class FileTooLargeException(long maxAllowedBytes)
    : Exception($"File exceeds the maximum allowed size of {maxAllowedBytes} bytes.")
{
    public long MaxAllowedBytes { get; } = maxAllowedBytes;
}
