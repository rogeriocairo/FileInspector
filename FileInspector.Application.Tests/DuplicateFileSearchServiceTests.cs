using FileInspector.Application.DuplicateFiles;

namespace FileInspector.Application.Tests;

public sealed class DuplicateFileSearchServiceTests
{
    private readonly DuplicateFileSearchService _service = new();

    [Fact]
    public void FindDuplicates_ReturnsEveryMatchingFileRecursivelyWithMetadata()
    {
        using var directory = new TemporaryDirectory();
        var nestedPath = Directory.CreateDirectory(Path.Combine(directory.Path, "nested")).FullName;
        var firstPath = directory.CreateFile("Report.txt", "first");
        var secondPath = Path.Combine(nestedPath, "report.TXT");
        File.WriteAllText(secondPath, "second file");
        directory.CreateFile("unique.bin", "unique");

        var expectedModifiedUtc = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc);
        File.SetLastWriteTimeUtc(firstPath, expectedModifiedUtc);
        File.SetLastWriteTimeUtc(secondPath, expectedModifiedUtc);

        var duplicates = _service.FindDuplicates(directory.Path);

        Assert.Equal(2, duplicates.Count);
        var first = Assert.Single(duplicates, duplicate => duplicate.FullPath == firstPath);
        Assert.Equal("Report.txt", first.Name);
        Assert.Equal(new FileInfo(firstPath).Length, first.SizeInBytes);
        Assert.Equal(TimeSpan.Zero, first.LastModifiedUtc.Offset);
        Assert.Equal(new DateTimeOffset(expectedModifiedUtc), first.LastModifiedUtc);

        var second = Assert.Single(duplicates, duplicate => duplicate.FullPath == secondPath);
        Assert.Equal("report.TXT", second.Name);
        Assert.Equal(new FileInfo(secondPath).Length, second.SizeInBytes);
        Assert.Equal(TimeSpan.Zero, second.LastModifiedUtc.Offset);
        Assert.Equal(new DateTimeOffset(expectedModifiedUtc), second.LastModifiedUtc);
    }

    [Fact]
    public void FindDuplicates_ReturnsEmptyWhenAllNamesAreUnique()
    {
        using var directory = new TemporaryDirectory();
        directory.CreateFile("one.txt", "one");
        directory.CreateFile("two.txt", "two");

        var duplicates = _service.FindDuplicates(directory.Path);

        Assert.Empty(duplicates);
    }

    [Fact]
    public void FindDuplicates_ThrowsWhenDirectoryDoesNotExist()
    {
        using var directory = new TemporaryDirectory();
        var missingDirectory = Path.Combine(directory.Path, "missing");

        Assert.Throws<DirectoryNotFoundException>(() => _service.FindDuplicates(missingDirectory));
    }

    [Fact]
    public void FindDuplicates_ThrowsWhenCancellationIsRequested()
    {
        using var directory = new TemporaryDirectory();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        Assert.Throws<OperationCanceledException>(
            () => _service.FindDuplicates(directory.Path, cancellation.Token));
    }

    private sealed class TemporaryDirectory : IDisposable
    {
        public TemporaryDirectory()
        {
            Path = System.IO.Path.Combine(
                System.IO.Path.GetTempPath(),
                $"FileInspectorTests-{Guid.NewGuid():N}");
            Directory.CreateDirectory(Path);
        }

        public string Path { get; }

        public string CreateFile(string name, string contents)
        {
            var filePath = System.IO.Path.Combine(Path, name);
            File.WriteAllText(filePath, contents);
            return filePath;
        }

        public void Dispose()
        {
            if (Directory.Exists(Path))
            {
                Directory.Delete(Path, recursive: true);
            }
        }
    }
}
