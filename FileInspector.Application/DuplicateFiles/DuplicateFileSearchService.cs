namespace FileInspector.Application.DuplicateFiles;

public sealed class DuplicateFileSearchService : IDuplicateFileSearchService
{
    public IReadOnlyList<DuplicateFileEntry> FindDuplicates(
        string directoryPath,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(directoryPath);
        cancellationToken.ThrowIfCancellationRequested();

        var fullDirectoryPath = Path.GetFullPath(directoryPath);
        if (!Directory.Exists(fullDirectoryPath))
        {
            throw new DirectoryNotFoundException($"Directory not found: {fullDirectoryPath}");
        }

        var enumerationOptions = new EnumerationOptions
        {
            RecurseSubdirectories = true,
            IgnoreInaccessible = false,
            AttributesToSkip = FileAttributes.ReparsePoint
        };
        var files = new List<DuplicateFileEntry>();

        foreach (var filePath in Directory.EnumerateFiles(fullDirectoryPath, "*", enumerationOptions))
        {
            cancellationToken.ThrowIfCancellationRequested();

            var fileInfo = new FileInfo(filePath);
            files.Add(new DuplicateFileEntry(
                fileInfo.Name,
                fileInfo.Length,
                new DateTimeOffset(fileInfo.LastWriteTimeUtc, TimeSpan.Zero),
                fileInfo.FullName));
        }

        var duplicateNames = files
            .GroupBy(file => file.Name, StringComparer.OrdinalIgnoreCase)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return files
            .Where(file => duplicateNames.Contains(file.Name))
            .OrderBy(file => file.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(file => file.FullPath, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }
}
