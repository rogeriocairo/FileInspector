namespace FileInspector.Application.DuplicateFiles;

public interface IDuplicateFileSearchService
{
    IReadOnlyList<DuplicateFileEntry> FindDuplicates(
        string directoryPath,
        CancellationToken cancellationToken = default);
}
